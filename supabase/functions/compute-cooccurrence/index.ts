/**
 * compute-cooccurrence — Computes card co-occurrence from community decks.
 * Generates pairwise card relationships for the recommendation engine.
 * Memory-safe: processes and flushes in segments.
 * @module functions/compute-cooccurrence
 */

// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, requireServiceRole } from '../_shared/auth.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('compute-cooccurrence');
const DECK_BATCH_SIZE = 100;
const FLUSH_THRESHOLD = 50_000; // Flush pairs to DB when map exceeds this size
const UPSERT_BATCH = 500;

async function flushPairs(
  supabase: any,
  pairCounts: Map<string, number>,
  targetFormat: string,
): Promise<number> {
  const significantPairs = Array.from(pairCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1]);

  let upserted = 0;
  for (let i = 0; i < significantPairs.length; i += UPSERT_BATCH) {
    const batch = significantPairs.slice(i, i + UPSERT_BATCH).map(([key, count]) => {
      const [a, b] = key.split('|');
      return {
        card_a_oracle_id: a,
        card_b_oracle_id: b,
        cooccurrence_count: count,
        format: targetFormat,
      };
    });

    const { error } = await supabase
      .from('card_cooccurrence')
      .upsert(batch, { onConflict: 'card_a_oracle_id,card_b_oracle_id,format' });

    if (!error) upserted += batch.length;
    else log.warn('Cooccurrence upsert failed', { batch: i, error: error.message });
  }

  return upserted;
}

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth guard: service role only
  const auth = requireServiceRole(req, corsHeaders);
  if (!auth.authorized) return auth.response;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Not configured' }), { status: 500, headers });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json().catch(() => ({}));
    const targetFormat = body.format ?? 'all';
    const fullRebuild = body.full_rebuild ?? false;

    if (fullRebuild) {
      await supabase
        .from('card_cooccurrence')
        .delete()
        .eq('format', targetFormat);
      log.info(`Cleared cooccurrence data for format=${targetFormat}`);
    }

    let query = supabase
      .from('community_decks')
      .select('id, format')
      .order('created_at', { ascending: false });

    if (targetFormat !== 'all') {
      query = query.eq('format', targetFormat);
    }

    const { data: decks, error: deckErr } = await query.limit(5000);
    if (deckErr) throw deckErr;
    if (!decks || decks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, decksProcessed: 0, pairs: 0 }),
        { status: 200, headers }
      );
    }

    log.info(`Processing ${decks.length} decks for cooccurrence (format=${targetFormat})`);

    const pairCounts = new Map<string, number>();
    let decksProcessed = 0;
    let totalUpserted = 0;

    for (let i = 0; i < decks.length; i += DECK_BATCH_SIZE) {
      const batch = decks.slice(i, i + DECK_BATCH_SIZE);
      const deckIds = batch.map((d) => d.id);

      const { data: cards, error: cardsErr } = await supabase
        .from('community_deck_cards')
        .select('deck_id, scryfall_oracle_id')
        .in('deck_id', deckIds)
        .not('scryfall_oracle_id', 'is', null);

      if (cardsErr || !cards) continue;

      const deckCardMap = new Map<string, string[]>();
      for (const c of cards) {
        const existing = deckCardMap.get(c.deck_id) ?? [];
        if (!existing.includes(c.scryfall_oracle_id)) {
          existing.push(c.scryfall_oracle_id);
        }
        deckCardMap.set(c.deck_id, existing);
      }

      for (const [, oracleIds] of deckCardMap) {
        // Limit to top 60 cards per deck to reduce pair explosion
        const ids = oracleIds.slice(0, 60);
        for (let a = 0; a < ids.length; a++) {
          for (let b = a + 1; b < ids.length; b++) {
            const key = ids[a] < ids[b]
              ? `${ids[a]}|${ids[b]}`
              : `${ids[b]}|${ids[a]}`;
            pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
          }
        }
        decksProcessed++;
      }

      // Memory safety: flush when map gets large
      if (pairCounts.size > FLUSH_THRESHOLD) {
        log.info(`Flushing ${pairCounts.size} pairs at deck batch ${i}`);
        totalUpserted += await flushPairs(supabase, pairCounts, targetFormat);
        pairCounts.clear();
      }
    }

    // Final flush
    if (pairCounts.size > 0) {
      totalUpserted += await flushPairs(supabase, pairCounts, targetFormat);
    }

    log.info(`Cooccurrence complete: pairs=${totalUpserted}, decks=${decksProcessed}`);
    return new Response(
      JSON.stringify({
        success: true,
        decksProcessed,
        upserted: totalUpserted,
        format: targetFormat,
      }),
      { status: 200, headers }
    );
  } catch (e) {
    log.error('compute-cooccurrence error', e);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers }
    );
  }
});
