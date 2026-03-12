/**
 * compute-cooccurrence — Computes card co-occurrence from community decks.
 * Generates pairwise card relationships with PMI-style normalized scoring.
 * Memory-safe: processes and flushes in segments.
 * @module functions/compute-cooccurrence
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, requireServiceRole } from '../_shared/auth.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('compute-cooccurrence');
const DECK_BATCH_SIZE = 100;
const FLUSH_THRESHOLD = 50_000;
const UPSERT_BATCH = 500;

/**
 * PMI-style co-play score: decksBoth / sqrt(deckCountA * deckCountB)
 * Prevents universally popular cards from dominating all relationships.
 */
function computeCoPlayScore(
  decksBoth: number,
  deckCountA: number,
  deckCountB: number,
): number {
  if (decksBoth <= 0 || deckCountA <= 0 || deckCountB <= 0) return 0;
  const denominator = Math.sqrt(deckCountA * deckCountB);
  if (denominator === 0) return 0;
  return Math.min(decksBoth / denominator, 1);
}

async function flushPairs(
  supabase: SupabaseClient,
  pairCounts: Map<string, number>,
  cardDeckCounts: Map<string, number>,
  targetFormat: string,
): Promise<number> {
  const significantPairs = Array.from(pairCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1]);

  let upserted = 0;
  for (let i = 0; i < significantPairs.length; i += UPSERT_BATCH) {
    const batch = significantPairs.slice(i, i + UPSERT_BATCH).map(([key, count]) => {
      const [a, b] = key.split('|');
      const deckCountA = cardDeckCounts.get(a) ?? 1;
      const deckCountB = cardDeckCounts.get(b) ?? 1;
      const weight = computeCoPlayScore(count, deckCountA, deckCountB);

      return {
        card_a_oracle_id: a,
        card_b_oracle_id: b,
        cooccurrence_count: count,
        relationship_type: 'co_played',
        weight,
        source: 'community_decks',
        context: { deck_count_a: deckCountA, deck_count_b: deckCountB },
        format: targetFormat,
        updated_at: new Date().toISOString(),
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

async function updateCardSignals(
  supabase: SupabaseClient,
  cardDeckCounts: Map<string, number>,
): Promise<number> {
  const entries = Array.from(cardDeckCounts.entries());
  let upserted = 0;

  for (let i = 0; i < entries.length; i += UPSERT_BATCH) {
    const batch = entries.slice(i, i + UPSERT_BATCH).map(([cardId, deckCount]) => ({
      card_id: cardId,
      deck_count: deckCount,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('card_signals')
      .upsert(batch, { onConflict: 'card_id' });

    if (!error) upserted += batch.length;
    else log.warn('Card signals upsert failed', { batch: i, error: error.message });
  }

  return upserted;
}

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Accept service role key OR pipeline secret (for pg_cron which can't access vault)
  const authCheck = requireServiceRole(req, corsHeaders);
  if (!authCheck.authorized) {
    // Fallback: check for pipeline secret in body
    const bodyText = await req.clone().text();
    let pipelineKeyValid = false;
    try {
      const parsed = JSON.parse(bodyText);
      const pipelineKey = Deno.env.get('OFFMETA_PIPELINE_KEY');
      if (pipelineKey && parsed.pipeline_key === pipelineKey) {
        pipelineKeyValid = true;
      }
    } catch { /* ignore */ }
    if (!pipelineKeyValid) {
      return authCheck.response;
    }
  }

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
    const cardDeckCounts = new Map<string, number>();
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
        const ids = oracleIds.slice(0, 60);

        // Track per-card deck counts for PMI normalization
        for (const id of ids) {
          cardDeckCounts.set(id, (cardDeckCounts.get(id) ?? 0) + 1);
        }

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

      if (pairCounts.size > FLUSH_THRESHOLD) {
        log.info(`Flushing ${pairCounts.size} pairs at deck batch ${i}`);
        totalUpserted += await flushPairs(supabase, pairCounts, cardDeckCounts, targetFormat);
        pairCounts.clear();
      }
    }

    // Final flush
    if (pairCounts.size > 0) {
      totalUpserted += await flushPairs(supabase, pairCounts, cardDeckCounts, targetFormat);
    }

    // Update card_signals with deck counts
    const signalsUpserted = await updateCardSignals(supabase, cardDeckCounts);

    log.info(`Cooccurrence complete: pairs=${totalUpserted}, signals=${signalsUpserted}, decks=${decksProcessed}`);
    return new Response(
      JSON.stringify({
        success: true,
        decksProcessed,
        upserted: totalUpserted,
        signalsUpserted,
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
