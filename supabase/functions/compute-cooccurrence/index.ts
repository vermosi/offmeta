/**
 * compute-cooccurrence — Computes card co-occurrence from community decks.
 * Generates pairwise card relationships for the recommendation engine.
 * Processes in chunks to handle large datasets.
 * @module functions/compute-cooccurrence
 */

// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/auth.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('compute-cooccurrence');
const DECK_BATCH_SIZE = 100;

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
      // Clear existing data for this format
      await supabase
        .from('card_cooccurrence')
        .delete()
        .eq('format', targetFormat);
      log.info(`Cleared cooccurrence data for format=${targetFormat}`);
    }

    // Fetch decks (optionally filtered by format)
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

    // Accumulate pairs in memory
    const pairCounts = new Map<string, number>();
    let decksProcessed = 0;

    for (let i = 0; i < decks.length; i += DECK_BATCH_SIZE) {
      const batch = decks.slice(i, i + DECK_BATCH_SIZE);
      const deckIds = batch.map((d) => d.id);

      const { data: cards, error: cardsErr } = await supabase
        .from('community_deck_cards')
        .select('deck_id, scryfall_oracle_id')
        .in('deck_id', deckIds)
        .not('scryfall_oracle_id', 'is', null);

      if (cardsErr || !cards) continue;

      // Group cards by deck
      const deckCardMap = new Map<string, string[]>();
      for (const c of cards) {
        const existing = deckCardMap.get(c.deck_id) ?? [];
        if (!existing.includes(c.scryfall_oracle_id)) {
          existing.push(c.scryfall_oracle_id);
        }
        deckCardMap.set(c.deck_id, existing);
      }

      // Compute pairwise co-occurrence
      for (const [, oracleIds] of deckCardMap) {
        // Limit pairs for very large decks (commander decks = 100 cards)
        const ids = oracleIds.slice(0, 100);
        for (let a = 0; a < ids.length; a++) {
          for (let b = a + 1; b < ids.length; b++) {
            // Ensure consistent ordering
            const key = ids[a] < ids[b]
              ? `${ids[a]}|${ids[b]}`
              : `${ids[b]}|${ids[a]}`;
            pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
          }
        }
        decksProcessed++;
      }
    }

    // Filter to pairs with count >= 2 (meaningful co-occurrence)
    const significantPairs = Array.from(pairCounts.entries())
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1]);

    log.info(`Found ${significantPairs.length} significant pairs from ${decksProcessed} decks`);

    // Upsert in batches
    const UPSERT_BATCH = 500;
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

      const { error: upsertErr } = await supabase
        .from('card_cooccurrence')
        .upsert(batch, { onConflict: 'card_a_oracle_id,card_b_oracle_id,format' });

      if (upsertErr) {
        log.warn('Cooccurrence upsert failed', { batch: i, error: upsertErr.message });
      } else {
        upserted += batch.length;
      }
    }

    log.info(`Cooccurrence complete: pairs=${upserted}, decks=${decksProcessed}`);
    return new Response(
      JSON.stringify({
        success: true,
        decksProcessed,
        totalPairs: significantPairs.length,
        upserted,
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
