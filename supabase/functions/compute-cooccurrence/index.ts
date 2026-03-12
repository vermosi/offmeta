/**
 * compute-cooccurrence — Multi-mode card relationship computation.
 * Modes:
 *   - cooccurrence (default): PMI-scored co-play pairs from community decks
 *   - similar_role: Deterministic role-based similarity from oracle_text
 *   - budget_alternative: Price-based alternatives for similar-role cards
 *   - all: Run all three in sequence
 * @module functions/compute-cooccurrence
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, requireServiceRole } from '../_shared/auth.ts';
import { createLogger } from '../_shared/logger.ts';
import {
  buildRoleProfile,
  findSimilarRolePairs,
  type CardForRoles,
  type CardRoleProfile,
} from '../_shared/card-roles.ts';

const log = createLogger('compute-cooccurrence');
const DECK_BATCH_SIZE = 100;
const FLUSH_THRESHOLD = 50_000;
const UPSERT_BATCH = 500;

// ─── Co-occurrence helpers ───────────────────────────────────────────

function computeCoPlayScore(decksBoth: number, deckCountA: number, deckCountB: number): number {
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

// ─── Co-occurrence mode ──────────────────────────────────────────────

async function runCooccurrence(
  supabase: SupabaseClient,
  targetFormat: string,
  fullRebuild: boolean,
): Promise<{ decksProcessed: number; upserted: number; signalsUpserted: number }> {
  if (fullRebuild) {
    await supabase.from('card_cooccurrence').delete().eq('format', targetFormat).eq('relationship_type', 'co_played');
    log.info(`Cleared co_played data for format=${targetFormat}`);
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
    return { decksProcessed: 0, upserted: 0, signalsUpserted: 0 };
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
      for (const id of ids) {
        cardDeckCounts.set(id, (cardDeckCounts.get(id) ?? 0) + 1);
      }
      for (let a = 0; a < ids.length; a++) {
        for (let b = a + 1; b < ids.length; b++) {
          const key = ids[a] < ids[b] ? `${ids[a]}|${ids[b]}` : `${ids[b]}|${ids[a]}`;
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

  if (pairCounts.size > 0) {
    totalUpserted += await flushPairs(supabase, pairCounts, cardDeckCounts, targetFormat);
  }

  const signalsUpserted = await updateCardSignals(supabase, cardDeckCounts);

  return { decksProcessed, upserted: totalUpserted, signalsUpserted };
}

// ─── Similar-role mode ───────────────────────────────────────────────

async function runSimilarRole(
  supabase: SupabaseClient,
  targetFormat: string,
  fullRebuild: boolean,
): Promise<{ cardsProfiled: number; pairsUpserted: number }> {
  if (fullRebuild) {
    await supabase.from('card_cooccurrence').delete().eq('relationship_type', 'similar_role').eq('format', targetFormat);
    log.info(`Cleared similar_role data for format=${targetFormat}`);
  }

  // Fetch cards with oracle text
  const { data: cards, error } = await supabase
    .from('cards')
    .select('oracle_id, name, oracle_text, type_line, cmc, colors')
    .not('oracle_text', 'is', null);

  if (error) throw error;
  if (!cards || cards.length === 0) return { cardsProfiled: 0, pairsUpserted: 0 };

  log.info(`Profiling ${cards.length} cards for similar_role`);

  const profiles: CardRoleProfile[] = (cards as CardForRoles[])
    .map(buildRoleProfile)
    .filter((p) => p.roles.length > 0);

  log.info(`${profiles.length} cards have at least one role`);

  const pairs = findSimilarRolePairs(profiles, 0.35, 8);
  log.info(`Found ${pairs.length} similar_role pairs above threshold`);

  let upserted = 0;
  for (let i = 0; i < pairs.length; i += UPSERT_BATCH) {
    const batch = pairs.slice(i, i + UPSERT_BATCH).map((p) => ({
      card_a_oracle_id: p.cardA,
      card_b_oracle_id: p.cardB,
      cooccurrence_count: 0,
      relationship_type: 'similar_role',
      weight: p.weight,
      source: 'oracle_text_analysis',
      context: { shared_roles: p.sharedRoles },
      format: targetFormat,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertErr } = await supabase
      .from('card_cooccurrence')
      .upsert(batch, { onConflict: 'card_a_oracle_id,card_b_oracle_id,format' });

    if (!upsertErr) upserted += batch.length;
    else log.warn('Similar role upsert failed', { batch: i, error: upsertErr.message });
  }

  return { cardsProfiled: profiles.length, pairsUpserted: upserted };
}

// ─── Budget-alternative mode ─────────────────────────────────────────

async function runBudgetAlternative(
  supabase: SupabaseClient,
  targetFormat: string,
  fullRebuild: boolean,
): Promise<{ pairsUpserted: number }> {
  if (fullRebuild) {
    await supabase.from('card_cooccurrence').delete().eq('relationship_type', 'budget_alternative').eq('format', targetFormat);
    log.info(`Cleared budget_alternative data for format=${targetFormat}`);
  }

  // Get similar_role pairs that exist
  const { data: rolePairs, error: roleErr } = await supabase
    .from('card_cooccurrence')
    .select('card_a_oracle_id, card_b_oracle_id, weight, context')
    .eq('relationship_type', 'similar_role')
    .eq('format', targetFormat)
    .gte('weight', 0.35)
    .order('weight', { ascending: false })
    .limit(5000);

  if (roleErr) throw roleErr;
  if (!rolePairs || rolePairs.length === 0) return { pairsUpserted: 0 };

  // Collect all oracle_ids we need prices for
  const oracleIds = new Set<string>();
  for (const p of rolePairs) {
    oracleIds.add(p.card_a_oracle_id);
    oracleIds.add(p.card_b_oracle_id);
  }

  // Get card names mapped to oracle_ids
  const oracleIdList = Array.from(oracleIds);
  const cardNameMap = new Map<string, string>();
  for (let i = 0; i < oracleIdList.length; i += UPSERT_BATCH) {
    const chunk = oracleIdList.slice(i, i + UPSERT_BATCH);
    const { data: cards } = await supabase
      .from('cards')
      .select('oracle_id, name')
      .in('oracle_id', chunk);
    if (cards) {
      for (const c of cards) cardNameMap.set(c.oracle_id, c.name);
    }
  }

  // Get latest prices for those card names
  const cardNames = Array.from(new Set(cardNameMap.values()));
  const priceMap = new Map<string, number>();
  for (let i = 0; i < cardNames.length; i += UPSERT_BATCH) {
    const chunk = cardNames.slice(i, i + UPSERT_BATCH);
    const { data: prices } = await supabase
      .from('price_snapshots')
      .select('card_name, price_usd')
      .in('card_name', chunk)
      .not('price_usd', 'is', null)
      .order('recorded_at', { ascending: false });

    if (prices) {
      for (const p of prices) {
        // Keep only latest price per card (first seen due to ORDER BY)
        if (!priceMap.has(p.card_name) && p.price_usd != null) {
          priceMap.set(p.card_name, Number(p.price_usd));
        }
      }
    }
  }

  // Find budget alternatives: card B is cheaper than card A by >= 2x
  const MIN_PRICE_RATIO = 2;
  const MIN_EXPENSIVE_PRICE = 1.0; // Don't flag budget alternatives for already-cheap cards
  const budgetPairs: Array<{
    expensive: string;
    budget: string;
    weight: number;
    context: Record<string, unknown>;
  }> = [];

  for (const pair of rolePairs) {
    const nameA = cardNameMap.get(pair.card_a_oracle_id);
    const nameB = cardNameMap.get(pair.card_b_oracle_id);
    if (!nameA || !nameB) continue;

    const priceA = priceMap.get(nameA);
    const priceB = priceMap.get(nameB);
    if (priceA == null || priceB == null || priceA <= 0 || priceB <= 0) continue;

    // Check both directions
    if (priceA >= MIN_EXPENSIVE_PRICE && priceA / priceB >= MIN_PRICE_RATIO) {
      const savingsRatio = 1 - priceB / priceA;
      budgetPairs.push({
        expensive: pair.card_a_oracle_id,
        budget: pair.card_b_oracle_id,
        weight: Math.min(pair.weight * savingsRatio, 1),
        context: {
          ...(pair.context as Record<string, unknown>),
          expensive_price: priceA,
          budget_price: priceB,
          savings_percent: Math.round(savingsRatio * 100),
        },
      });
    }
    if (priceB >= MIN_EXPENSIVE_PRICE && priceB / priceA >= MIN_PRICE_RATIO) {
      const savingsRatio = 1 - priceA / priceB;
      budgetPairs.push({
        expensive: pair.card_b_oracle_id,
        budget: pair.card_a_oracle_id,
        weight: Math.min(pair.weight * savingsRatio, 1),
        context: {
          ...(pair.context as Record<string, unknown>),
          expensive_price: priceB,
          budget_price: priceA,
          savings_percent: Math.round(savingsRatio * 100),
        },
      });
    }
  }

  log.info(`Found ${budgetPairs.length} budget_alternative pairs`);

  let upserted = 0;
  for (let i = 0; i < budgetPairs.length; i += UPSERT_BATCH) {
    const batch = budgetPairs.slice(i, i + UPSERT_BATCH).map((p) => ({
      card_a_oracle_id: p.expensive,
      card_b_oracle_id: p.budget,
      cooccurrence_count: 0,
      relationship_type: 'budget_alternative',
      weight: p.weight,
      source: 'price_comparison',
      context: p.context,
      format: targetFormat,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertErr } = await supabase
      .from('card_cooccurrence')
      .upsert(batch, { onConflict: 'card_a_oracle_id,card_b_oracle_id,format' });

    if (!upsertErr) upserted += batch.length;
    else log.warn('Budget alternative upsert failed', { batch: i, error: upsertErr.message });
  }

  return { pairsUpserted: upserted };
}

// ─── Main handler ────────────────────────────────────────────────────

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authCheck = requireServiceRole(req, corsHeaders);
  if (!authCheck.authorized) {
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
    const mode: string = body.mode ?? 'cooccurrence';

    const results: Record<string, unknown> = { success: true, mode, format: targetFormat };

    if (mode === 'cooccurrence' || mode === 'all') {
      const coResult = await runCooccurrence(supabase, targetFormat, fullRebuild);
      results.cooccurrence = coResult;
      log.info(`Cooccurrence: pairs=${coResult.upserted}, signals=${coResult.signalsUpserted}, decks=${coResult.decksProcessed}`);
    }

    if (mode === 'similar_role' || mode === 'all') {
      const srResult = await runSimilarRole(supabase, targetFormat, fullRebuild);
      results.similar_role = srResult;
      log.info(`Similar role: profiled=${srResult.cardsProfiled}, pairs=${srResult.pairsUpserted}`);
    }

    if (mode === 'budget_alternative' || mode === 'all') {
      const baResult = await runBudgetAlternative(supabase, targetFormat, fullRebuild);
      results.budget_alternative = baResult;
      log.info(`Budget alternative: pairs=${baResult.pairsUpserted}`);
    }

    return new Response(JSON.stringify(results), { status: 200, headers });
  } catch (e) {
    log.error('compute-cooccurrence error', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers });
  }
});
