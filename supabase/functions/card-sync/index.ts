/**
 * card-sync — Populates the cards table with Scryfall metadata
 * for all unique oracle IDs found in community_deck_cards.
 * Processes in batches using Scryfall collection endpoint.
 * @module functions/card-sync
 */


import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, validateAuth } from '../_shared/auth.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('card-sync');
const SCRYFALL_BATCH_SIZE = 75;
const SCRYFALL_DELAY_MS = 100;

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth guard: accept anon key (for pg_cron) or service role
  const auth = await validateAuth(req);
  if (!auth.authorized) {
    return new Response(JSON.stringify({ error: auth.error }), { status: 401, headers });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Not configured' }), { status: 500, headers });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Use the get_missing_oracle_ids RPC (created via migration)
    const { data: missingCards, error: rpcErr } = await supabase
      .rpc('get_missing_oracle_ids')
      .limit(1000);

    let oracleIds: string[] = [];
    if (rpcErr || !missingCards) {
      log.warn('get_missing_oracle_ids RPC failed, using fallback', { error: rpcErr?.message });
      // Paginated fallback: fetch oracle IDs not yet in cards table
      const allIds = new Set<string>();
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data: chunk } = await supabase
          .from('community_deck_cards')
          .select('scryfall_oracle_id')
          .not('scryfall_oracle_id', 'is', null)
          .range(from, from + PAGE - 1);
        if (!chunk || chunk.length === 0) break;
        for (const c of chunk) {
          if (c.scryfall_oracle_id) allIds.add(c.scryfall_oracle_id);
        }
        if (chunk.length < PAGE) break;
        from += PAGE;
      }

      const { data: existingCards } = await supabase
        .from('cards')
        .select('oracle_id');

      const existingSet = new Set((existingCards ?? []).map((c) => c.oracle_id));
      oracleIds = Array.from(allIds).filter((id) => !existingSet.has(id));
    } else {
      oracleIds = (missingCards as Array<{ oracle_id: string }>).map((r) => r.oracle_id);
    }

    if (oracleIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, synced: 0, message: 'All cards up to date' }),
        { status: 200, headers }
      );
    }

    log.info(`Syncing ${oracleIds.length} cards from Scryfall`);
    let synced = 0;

    for (let i = 0; i < oracleIds.length; i += SCRYFALL_BATCH_SIZE) {
      const batch = oracleIds.slice(i, i + SCRYFALL_BATCH_SIZE);
      const identifiers = batch.map((id) => ({ oracle_id: id }));

      try {
        const resp = await fetch('https://api.scryfall.com/cards/collection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifiers }),
        });

        if (resp.ok) {
          const data = await resp.json();
          const cardRows = (data.data ?? []).map((card: Record<string, unknown>) => ({
            oracle_id: card.oracle_id,
            name: card.name,
            mana_cost: card.mana_cost ?? null,
            type_line: card.type_line ?? null,
            oracle_text: card.oracle_text ?? null,
            colors: card.colors ?? [],
            cmc: card.cmc ?? 0,
            image_url: card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? null,
            updated_at: new Date().toISOString(),
          }));

          if (cardRows.length > 0) {
            const { error: upsertErr } = await supabase
              .from('cards')
              .upsert(cardRows, { onConflict: 'oracle_id' });
            if (upsertErr) {
              log.warn('Card upsert failed', { batch: i, error: upsertErr.message });
            } else {
              synced += cardRows.length;
            }
          }
        } else {
          await resp.text();
          log.warn('Scryfall collection batch failed', { status: resp.status });
        }
      } catch (e) {
        log.warn('Scryfall batch error', { batch: i, error: String(e) });
      }

      if (i + SCRYFALL_BATCH_SIZE < oracleIds.length) {
        await new Promise((r) => setTimeout(r, SCRYFALL_DELAY_MS));
      }
    }

    log.info(`Card sync complete: synced=${synced}`);
    return new Response(
      JSON.stringify({ success: true, synced, total: oracleIds.length }),
      { status: 200, headers }
    );
  } catch (e) {
    log.error('card-sync error', e);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers }
    );
  }
});
