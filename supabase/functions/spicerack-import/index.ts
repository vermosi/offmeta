/**
 * spicerack-import — Fetches tournament decklists from Spicerack API.
 * Maps cards to Scryfall oracle IDs and stores in community_decks.
 * @module functions/spicerack-import
 */

// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/auth.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('spicerack-import');
const SCRYFALL_DELAY_MS = 100;

const oracleCache = new Map<string, string | null>();

async function resolveOracleId(cardName: string): Promise<string | null> {
  if (oracleCache.has(cardName)) return oracleCache.get(cardName)!;
  try {
    const resp = await fetch(
      `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`
    );
    if (resp.ok) {
      const data = await resp.json();
      oracleCache.set(cardName, data.oracle_id ?? null);
      return data.oracle_id ?? null;
    }
    await resp.text();
  } catch (e) {
    log.warn('Oracle resolve failed', { cardName, error: String(e) });
  }
  oracleCache.set(cardName, null);
  return null;
}

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
    const page = body.page ?? 1;
    const perPage = body.per_page ?? 50;

    // Fetch from Spicerack API
    const apiUrl = `https://api.spicerack.gg/public/decks?page=${page}&per_page=${perPage}`;
    log.info(`Fetching Spicerack decks: ${apiUrl}`);

    const apiResp = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
    });

    if (!apiResp.ok) {
      const text = await apiResp.text();
      // If the API doesn't exist or is down, return gracefully
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

      // Check duplicate
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

      // Process cards
      const mainboard = deck.mainboard ?? deck.main ?? deck.cards ?? [];
      const sideboard = deck.sideboard ?? deck.side ?? [];
      const cardRows = [];

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

      for (const card of allCards) {
        if (!card.name) continue;
        const oracleId = await resolveOracleId(card.name);
        cardRows.push({
          deck_id: deckRow.id,
          card_name: card.name,
          scryfall_oracle_id: oracleId,
          quantity: card.quantity,
          board: card.board,
        });
        await new Promise((r) => setTimeout(r, SCRYFALL_DELAY_MS));
      }

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
