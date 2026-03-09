/**
 * spicerack-import — Fetches tournament decklists from Spicerack API.
 * Maps cards to Scryfall oracle IDs and stores in community_decks.
 * @module functions/spicerack-import
 */

// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, requireServiceRole } from '../_shared/auth.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('spicerack-import');
const SCRYFALL_DELAY_MS = 100;
const SCRYFALL_BATCH_SIZE = 75;

/**
 * Batch-resolve oracle IDs using Scryfall /cards/collection endpoint.
 */
async function batchResolveOracleIds(
  cardNames: string[],
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  const unique = [...new Set(cardNames)];

  for (let i = 0; i < unique.length; i += SCRYFALL_BATCH_SIZE) {
    const batch = unique.slice(i, i + SCRYFALL_BATCH_SIZE);
    const identifiers = batch.map((name) => ({ name }));

    try {
      const resp = await fetch('https://api.scryfall.com/cards/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifiers }),
      });

      if (resp.ok) {
        const data = await resp.json();
        for (const card of data.data ?? []) {
          result.set(card.name, card.oracle_id ?? null);
        }
        for (const name of batch) {
          if (!result.has(name)) result.set(name, null);
        }
      } else {
        await resp.text();
        for (const name of batch) result.set(name, null);
      }
    } catch {
      for (const name of batch) result.set(name, null);
    }

    if (i + SCRYFALL_BATCH_SIZE < unique.length) {
      await new Promise((r) => setTimeout(r, SCRYFALL_DELAY_MS));
    }
  }

  return result;
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
    const page = body.page ?? 1;
    const perPage = body.per_page ?? 50;

    const apiUrl = `https://api.spicerack.gg/public/decks?page=${page}&per_page=${perPage}`;
    log.info(`Fetching Spicerack decks: ${apiUrl}`);

    const apiResp = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
    });

    if (!apiResp.ok) {
      const text = await apiResp.text();
      if (apiResp.status === 404) {
        return new Response(
          JSON.stringify({ success: true, message: 'Spicerack API not available', imported: 0 }),
          { status: 200, headers }
        );
      }
      throw new Error(`Spicerack API error: ${apiResp.status} ${text.slice(0, 200)}`);
    }

    const apiData = await apiResp.json();
    const decks = apiData.data ?? apiData.decks ?? apiData ?? [];

    if (!Array.isArray(decks) || decks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No decks returned', imported: 0 }),
        { status: 200, headers }
      );
    }

    let imported = 0;
    let skipped = 0;

    for (const deck of decks) {
      const sourceId = String(deck.id ?? deck.deck_id ?? '');
      if (!sourceId) { skipped++; continue; }

      const { data: existing } = await supabase
        .from('community_decks')
        .select('id')
        .eq('source', 'spicerack')
        .eq('source_id', sourceId)
        .maybeSingle();

      if (existing) { skipped++; continue; }

      const format = String(deck.format ?? 'unknown').toLowerCase();
      const commander = deck.commander ?? deck.commander_name ?? null;
      const colors: string[] = deck.colors ?? deck.color_identity ?? [];

      const { data: deckRow, error: deckErr } = await supabase
        .from('community_decks')
        .insert({
          name: String(deck.name ?? deck.title ?? 'Unnamed'),
          format,
          source: 'spicerack',
          source_id: sourceId,
          commander,
          colors,
          event_name: deck.event ?? deck.event_name ?? null,
          event_date: deck.date ?? deck.event_date ?? null,
        })
        .select('id')
        .single();

      if (deckErr || !deckRow) {
        log.warn('Deck insert failed', { sourceId, error: deckErr?.message });
        skipped++;
        continue;
      }

      // Batch resolve oracle IDs
      const mainboard = deck.mainboard ?? deck.main ?? deck.cards ?? [];
      const sideboard = deck.sideboard ?? deck.side ?? [];
      const allCards = [
        ...(Array.isArray(mainboard) ? mainboard : []).map((c: Record<string, unknown>) => ({
          name: String(c.name ?? c.card_name ?? ''),
          quantity: Number(c.quantity ?? c.count ?? 1),
          board: 'mainboard',
        })),
        ...(Array.isArray(sideboard) ? sideboard : []).map((c: Record<string, unknown>) => ({
          name: String(c.name ?? c.card_name ?? ''),
          quantity: Number(c.quantity ?? c.count ?? 1),
          board: 'sideboard',
        })),
      ];

      const cardNames = allCards.map((c) => c.name).filter(Boolean);
      const oracleMap = await batchResolveOracleIds(cardNames);

      const cardRows = allCards
        .filter((c) => c.name)
        .map((card) => ({
          deck_id: deckRow.id,
          card_name: card.name,
          scryfall_oracle_id: oracleMap.get(card.name) ?? null,
          quantity: card.quantity,
          board: card.board,
        }));

      if (cardRows.length > 0) {
        await supabase.from('community_deck_cards').insert(cardRows);
      }

      imported++;
    }

    log.info(`Spicerack import: imported=${imported}, skipped=${skipped}`);

    return new Response(
      JSON.stringify({ success: true, imported, skipped, page }),
      { status: 200, headers }
    );
  } catch (e) {
    log.error('spicerack-import error', e);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers }
    );
  }
});
