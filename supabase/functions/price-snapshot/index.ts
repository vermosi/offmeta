/**
 * price-snapshot — Daily incremental price capture for already-tracked
 * cards. Full-catalog price backfill is handled
 * weekly by bulk-data-sync.
 *
 * Source: card names already present in recent price_snapshots, so existing
 * price history stays continuous between weekly full syncs.
 *
 * @module functions/price-snapshot
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, requireServiceOrPipelineKey } from '../_shared/auth.ts';
import { createLogger, withLogging } from '../_shared/logger.ts';
import { reportEdgeError } from '../_shared/errorReporter.ts';

const BATCH_SIZE = 75;
const SCRYFALL_DELAY_MS = 120;
/** Scryfall ids are v4 UUIDs; locally generated v5 ids are rejected by the API. */
const SCRYFALL_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** A card with no snapshot inside this window is considered stale. */
const STALE_AFTER_HOURS = 48;
/** Upper bound on cards pulled back in by the backfill, per run. */
const MAX_BACKFILL_CARDS = 750;

const log = createLogger('price-snapshot');

/**
 * Cards that must be re-fetched from Scryfall regardless of the normal
 * "reuse a snapshot < 24h old" shortcut:
 *
 *   - stale: tracked in the last 90 days but with no snapshot inside the
 *     staleness window, including cards that aged out of the 30-day tracking
 *     query and would otherwise never be picked up again.
 *   - errored: named by an unresolved price-snapshot error_event.
 *
 * @returns names to force-refresh plus the error rows that asked for them.
 */
async function collectBackfillTargets(
  // deno-lint-ignore no-explicit-any
  supabase: any,
): Promise<{ names: Map<string, string | null>; errorIds: string[] }> {
  const names = new Map<string, string | null>();
  const errorIds: string[] = [];

  const staleCutoff = new Date(Date.now() - STALE_AFTER_HOURS * 3_600_000).toISOString();
  const historyCutoff = new Date(Date.now() - 90 * 24 * 3_600_000).toISOString();

  // Everything seen in the last 90 days, minus everything seen recently.
  const [{ data: history }, { data: recent }] = await Promise.all([
    supabase
      .from('price_snapshots')
      .select('card_name, scryfall_id')
      .gte('recorded_at', historyCutoff)
      .limit(20000),
    supabase
      .from('price_snapshots')
      .select('card_name')
      .gte('recorded_at', staleCutoff)
      .limit(20000),
  ]);

  const fresh = new Set<string>((recent ?? []).map((r: { card_name: string }) => r.card_name));
  for (const row of history ?? []) {
    if (fresh.has(row.card_name) || names.has(row.card_name)) continue;
    names.set(row.card_name, row.scryfall_id ?? null);
    if (names.size >= MAX_BACKFILL_CARDS) break;
  }

  // Cards the pipeline previously failed on.
  const { data: errorRows } = await supabase
    .from('error_events')
    .select('id, context')
    .eq('source', 'price-snapshot')
    .in('status', ['open', 'failed'])
    .limit(50);

  for (const row of errorRows ?? []) {
    const ctx = (row.context ?? {}) as Record<string, unknown>;
    const listed = [
      ...(Array.isArray(ctx.cardNames) ? ctx.cardNames : []),
      ...(typeof ctx.card_name === 'string' ? [ctx.card_name] : []),
    ];
    for (const name of listed) {
      if (typeof name === 'string' && name.trim() && !names.has(name)) {
        names.set(name, null);
      }
    }
    errorIds.push(row.id as string);
  }

  return { names, errorIds };
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

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Not configured' }), { status: 500, headers });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const uniqueCards = new Map<string, string | null>(); // card_name → scryfall_id

    // Source: cards already tracked in recent snapshots (keeps history fresh)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: trackedCards } = await supabase
      .from('price_snapshots')
      .select('card_name, scryfall_id')
      .gte('recorded_at', thirtyDaysAgo)
      .limit(5000);

    for (const c of trackedCards ?? []) {
      if (!uniqueCards.has(c.card_name)) {
        uniqueCards.set(c.card_name, c.scryfall_id);
      }
    }

    // Automatic backfill: pull back stale and previously-failed cards.
    const backfill = await collectBackfillTargets(supabase);
    for (const [name, id] of backfill.names) {
      if (!uniqueCards.has(name)) uniqueCards.set(name, id);
    }
    log.info(`Backfill targets: ${backfill.names.size} (errors: ${backfill.errorIds.length})`);

    const cardList = Array.from(uniqueCards.entries());
    log.info(`Tracking ${cardList.length} cards`);

    if (cardList.length === 0) {
      return new Response(JSON.stringify({ success: true, snapshotCount: 0, backfilled: 0 }), { status: 200, headers });
    }


    // ── Try local cards table for prices first ────────────────────
    const snapshots: Array<{
      card_name: string;
      scryfall_id: string | null;
      source: string;
      price_usd: number | null;
      price_usd_foil: number | null;
    }> = [];

    // Check cards table for prices (from bulk-data-sync)
    const cardNamesOnly = cardList.map(([name]) => name);
    const localPriceMap = new Map<string, boolean>();

    for (let i = 0; i < cardNamesOnly.length; i += 100) {
      const batch = cardNamesOnly.slice(i, i + 100);
      try {
        // Get the most recent price snapshot for these cards
        const { data } = await supabase
          .from('price_snapshots')
          .select('card_name, scryfall_id, price_usd, price_usd_foil, recorded_at')
          .in('card_name', batch)
          .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('recorded_at', { ascending: false });

        if (data) {
          const seen = new Set<string>();
          for (const row of data) {
            if (seen.has(row.card_name)) continue;
            seen.add(row.card_name);
            // If we have a recent snapshot (< 24h), reuse it
            if (row.price_usd !== null || row.price_usd_foil !== null) {
              snapshots.push({
                card_name: row.card_name,
                scryfall_id: row.scryfall_id,
                source: 'scryfall',
                price_usd: row.price_usd ? Number(row.price_usd) : null,
                price_usd_foil: row.price_usd_foil ? Number(row.price_usd_foil) : null,
              });
              localPriceMap.set(row.card_name, true);
            }
          }
        }
      } catch { /* continue */ }
    }

    // Find cards that still need Scryfall prices
    const needScryfall = cardList.filter(([name]) => !localPriceMap.has(name));
    log.info(`Local prices: ${localPriceMap.size}, need Scryfall: ${needScryfall.length}`);

    // Batch fetch remaining prices from Scryfall.
    // Some stored scryfall_id values are synthetic (not real Scryfall UUIDs);
    // Scryfall rejects the whole batch with a 400 when one is malformed, so we
    // only send ids that look like real Scryfall UUIDs and fall back to a
    // name-only retry if a batch is rejected anyway.
    const collectPrices = async (
      identifiers: Array<{ id: string } | { name: string }>,
      label: string,
    ): Promise<'ok' | 'rejected' | 'failed'> => {
      try {
        const resp = await fetch('https://api.scryfall.com/cards/collection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifiers }),
        });
        if (!resp.ok) {
          const errText = await resp.text();
          log.warn(`Scryfall batch ${label} returned ${resp.status}`, {
            body: errText.slice(0, 200),
          });
          return 'rejected';
        }
        const data = await resp.json();
        for (const card of data.data ?? []) {
          snapshots.push({
            card_name: card.name,
            scryfall_id: card.id,
            source: 'scryfall',
            price_usd: card.prices?.usd ? parseFloat(card.prices.usd) : null,
            price_usd_foil: card.prices?.usd_foil ? parseFloat(card.prices.usd_foil) : null,
          });
        }
        return 'ok';
      } catch (e) {
        log.warn('Scryfall batch failed', { batch: label, error: String(e) });
        return 'failed';
      }
    };

    for (let i = 0; i < needScryfall.length; i += BATCH_SIZE) {
      const batch = needScryfall.slice(i, i + BATCH_SIZE);
      const identifiers = batch.map(([name, id]) =>
        id && SCRYFALL_UUID.test(id) ? { id } : { name },
      );

      const outcome = await collectPrices(identifiers, String(i));
      if (outcome === 'rejected') {
        // Retry the same batch by name only — never let one bad id zero out a run.
        await new Promise((r) => setTimeout(r, SCRYFALL_DELAY_MS));
        await collectPrices(batch.map(([name]) => ({ name })), `${i}:by-name`);
      }

      if (i + BATCH_SIZE < needScryfall.length) {
        await new Promise((r) => setTimeout(r, SCRYFALL_DELAY_MS));
      }
    }


    // ── Insert snapshots ────────────────────────────────────────────

    if (snapshots.length > 0) {
      for (let i = 0; i < snapshots.length; i += 500) {
        const chunk = snapshots.slice(i, i + 500);
        const { error: insertErr } = await supabase
          .from('price_snapshots')
          .insert(chunk);

        if (insertErr) {
          log.error(`Failed to insert snapshot chunk ${i}`, insertErr);
          throw insertErr;
        }
      }
    }

    // ── Cleanup old snapshots (>90 days) ────────────────────────────

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('price_snapshots')
      .delete()
      .lt('recorded_at', ninetyDaysAgo);

    log.info(`Captured ${snapshots.length} price snapshots`);

    // A run that tracked cards but captured nothing is a silent failure —
    // surface it so the auto-fix/watchdog loop can act on it.
    if (snapshots.length === 0 && cardList.length > 0) {
      await reportEdgeError({
        source: 'price-snapshot',
        errorType: 'price_snapshot_empty_capture',
        message: `Tracked ${cardList.length} cards but captured 0 price snapshots`,
        severity: 'error',
        context: { trackedCards: cardList.length, neededScryfall: needScryfall.length },
      });
    }


    return new Response(
      JSON.stringify({
        success: true,
        snapshotCount: snapshots.length,
        sources: {
          uniqueTracked: cardList.length,
        },
      }),
      { status: 200, headers },
    );
  } catch (e) {
    log.error('price-snapshot error', e);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers },
    );
  }
}));
