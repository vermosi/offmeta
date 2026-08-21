/**
 * price-snapshot — Daily price capture for the full local card catalog.
 *
 * Previously this function sourced card names from an unordered `limit(5000)`
 * read of `price_snapshots`. On a multi-million row table that returns an
 * arbitrary slice (in practice the oldest surviving tuples), so the job kept
 * re-snapshotting the same ~90 cards forever and price charts flat-lined.
 *
 * Now it walks `public.cards` deterministically (ordered by name) in chunks and
 * self-invokes for the next chunk, so every card gets a fresh daily price.
 *
 * Body: `{ offset?: number }` — starting row in the ordered catalog.
 *
 * @module functions/price-snapshot
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, requireServiceOrPipelineKey } from '../_shared/auth.ts';
import { createLogger, withLogging } from '../_shared/logger.ts';
import { reportEdgeError } from '../_shared/errorReporter.ts';

/** Scryfall's /cards/collection endpoint accepts at most 75 identifiers. */
const BATCH_SIZE = 75;
const SCRYFALL_DELAY_MS = 120;
/** Cards processed per invocation before handing off to the next chunk. */
const CHUNK_SIZE = 1500;
/** Safety stop so a runaway catalog can never loop forever. */
const MAX_OFFSET = 200_000;
const log = createLogger('price-snapshot');

interface Snapshot {
  card_name: string;
  scryfall_id: string | null;
  source: string;
  price_usd: number | null;
  price_usd_foil: number | null;
}

/** Reads one ordered slice of the local catalog. */
async function loadCatalogChunk(
  supabase: ReturnType<typeof createClient>,
  offset: number,
): Promise<string[]> {
  const rows: string[] = [];
  const PAGE = 1000;

  for (let read = 0; read < CHUNK_SIZE; read += PAGE) {
    const from = offset + read;
    const { data, error } = await supabase
      .from('cards')
      .select('name')
      .order('name', { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) {
      log.warn('Catalog page read failed', { from, error: error.message });
      break;
    }
    const page = (data ?? []) as Array<{ name: string }>;
    for (const row of page) {
      if (row.name) rows.push(row.name);
    }
    if (page.length < PAGE) break;
  }

  return rows;
}

serve(withLogging('price-snapshot', async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authCheck = await requireServiceOrPipelineKey(req, corsHeaders);
  if (!authCheck.authorized) return authCheck.response;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const pipelineKey = Deno.env.get('OFFMETA_PIPELINE_KEY') ?? null;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Not configured' }), { status: 500, headers });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let offset = 0;
  try {
    const body = await req.json();
    if (typeof body?.offset === 'number' && body.offset > 0) {
      offset = Math.min(Math.floor(body.offset), MAX_OFFSET);
    }
  } catch {
    // default offset 0
  }

  try {
    const cardList = await loadCatalogChunk(supabase, offset);
    log.info(`Chunk at offset ${offset}: ${cardList.length} cards`);

    if (cardList.length === 0) {
      return new Response(
        JSON.stringify({ success: true, offset, snapshotCount: 0, done: true }),
        { status: 200, headers },
      );
    }

    let inserted = 0;

    /** Persists a batch immediately so partial progress survives a timeout. */
    const persist = async (rows: Snapshot[]): Promise<void> => {
      if (rows.length === 0) return;
      const { error: insertErr } = await supabase.from('price_snapshots').insert(rows);
      if (insertErr) {
        log.error('Failed to insert snapshot batch', insertErr);
        return;
      }
      inserted += rows.length;
    };

    /** Fetches prices for one batch of card names. */
    const collectPrices = async (
      identifiers: Array<{ name: string }>,
      label: string,
    ): Promise<'ok' | 'rejected' | 'failed'> => {
      try {
        const resp = await scryfallFetch('https://api.scryfall.com/cards/collection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifiers }),
          timeoutMs: 20000,
          failFastOnCooldown: false,
        });
        if (!resp.ok) {
          const errText = await resp.text();
          log.warn(`Scryfall batch ${label} returned ${resp.status}`, {
            body: errText.slice(0, 200),
          });
          return 'rejected';
        }
        const data = await resp.json();
        const rows: Snapshot[] = [];
        for (const card of data.data ?? []) {
          rows.push({
            card_name: card.name,
            scryfall_id: card.id,
            source: 'scryfall',
            price_usd: card.prices?.usd ? parseFloat(card.prices.usd) : null,
            price_usd_foil: card.prices?.usd_foil ? parseFloat(card.prices.usd_foil) : null,
          });
        }
        await persist(rows);
        return 'ok';
      } catch (e) {
        log.warn('Scryfall batch failed', { batch: label, error: String(e) });
        return 'failed';
      }
    };

    for (let i = 0; i < cardList.length; i += BATCH_SIZE) {
      const batch = cardList.slice(i, i + BATCH_SIZE);
      const outcome = await collectPrices(batch.map((name) => ({ name })), String(i));
      if (outcome === 'rejected') {
        log.warn('Batch rejected by Scryfall', { offset, batchStart: i });
      }

      if (i + BATCH_SIZE < cardList.length) {
        await new Promise((r) => setTimeout(r, SCRYFALL_DELAY_MS));
      }
    }


    // ── Cleanup old snapshots (>90 days), first chunk only ──────────
    if (offset === 0) {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('price_snapshots').delete().lt('recorded_at', ninetyDaysAgo);
    }

    log.info(`Captured ${inserted} price snapshots at offset ${offset}`);

    // A chunk that had cards but captured nothing is a silent failure.
    if (inserted === 0) {
      await reportEdgeError({
        source: 'price-snapshot',
        errorType: 'price_snapshot_empty_capture',
        message: `Tracked ${cardList.length} cards but captured 0 price snapshots`,
        severity: 'error',
        context: { offset, trackedCards: cardList.length },
      });
    }

    // ── Hand off to the next chunk ──────────────────────────────────
    const nextOffset = offset + cardList.length;
    const hasMore = cardList.length >= CHUNK_SIZE && nextOffset < MAX_OFFSET;

    if (hasMore) {
      fetch(`${supabaseUrl}/functions/v1/price-snapshot`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ offset: nextOffset, pipeline_key: pipelineKey }),
      }).catch((err) => {
        log.warn('Failed to self-invoke next chunk', { error: String(err) });
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        offset,
        cardsInChunk: cardList.length,
        snapshotCount: inserted,
        nextOffset: hasMore ? nextOffset : null,
        done: !hasMore,
      }),
      { status: 200, headers },
    );
  } catch (e) {
    log.error('price-snapshot error', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers });
  }
}));
