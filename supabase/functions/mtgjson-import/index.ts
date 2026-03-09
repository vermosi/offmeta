/**
 * mtgjson-import — Chunked importer for MTGJSON AllDecks dataset.
 * Processes decks in batches to stay within edge function limits.
 * Accepts { offset, limit } to process a slice of the dataset.
 * @module functions/mtgjson-import
 */


import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, requireServiceRole } from '../_shared/auth.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('mtgjson-import');
const SCRYFALL_DELAY_MS = 100;
const SCRYFALL_BATCH_SIZE = 75;
const DECK_BATCH_SIZE = 50;

/**
 * Batch-resolve oracle IDs using Scryfall /cards/collection endpoint.
 * Returns a Map of cardName → oracleId.
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
        // Mark not-found cards
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

function inferFormat(deck: Record<string, unknown>): string {
  const type = String(deck.type ?? '').toLowerCase();
  if (type.includes('commander') || type.includes('edh')) return 'commander';
  if (type.includes('standard')) return 'standard';
  if (type.includes('modern')) return 'modern';
  if (type.includes('legacy')) return 'legacy';
  if (type.includes('vintage')) return 'vintage';
  if (type.includes('pioneer')) return 'pioneer';
  if (type.includes('pauper')) return 'pauper';
  if (type.includes('brawl')) return 'brawl';
  return 'casual';
}

function extractColors(cards: Array<{ colors?: string[] }>): string[] {
  const colorSet = new Set<string>();
  for (const c of cards) {
    if (c.colors) c.colors.forEach((clr: string) => colorSet.add(clr));
  }
  return Array.from(colorSet);
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
    const offset = body.offset ?? 0;
    const limit = body.limit ?? DECK_BATCH_SIZE;

    // Download the MTGJSON dataset index (deck list)
    log.info(`Fetching MTGJSON AllDeckList for offset=${offset}, limit=${limit}`);
    const listResp = await fetch('https://mtgjson.com/api/v5/DeckList.json');
    if (!listResp.ok) {
      const text = await listResp.text();
      throw new Error(`Failed to fetch DeckList: ${listResp.status} ${text}`);
    }
    const deckListData = await listResp.json();
    const allDecks: Array<Record<string, unknown>> = deckListData.data ?? [];

    if (offset >= allDecks.length) {
      return new Response(
        JSON.stringify({ success: true, message: 'No more decks to process', total: allDecks.length }),
        { status: 200, headers }
      );
    }

    const batch = allDecks.slice(offset, offset + limit);
    let imported = 0;
    let skipped = 0;

    for (const deckMeta of batch) {
      const deckCode = String(deckMeta.code ?? deckMeta.fileName ?? '');
      if (!deckCode) { skipped++; continue; }

      // Check if already imported
      const { data: existing } = await supabase
        .from('community_decks')
        .select('id')
        .eq('source', 'mtgjson')
        .eq('source_id', deckCode)
        .maybeSingle();

      if (existing) { skipped++; continue; }

      // Fetch individual deck
      const deckResp = await fetch(`https://mtgjson.com/api/v5/decks/${deckCode}.json`);
      if (!deckResp.ok) {
        await deckResp.text();
        skipped++;
        continue;
      }
      const deckJson = await deckResp.json();
      const deck = deckJson.data ?? deckJson;

      const format = inferFormat(deck);
      const mainboard: Array<{ name: string; count: number; colors?: string[] }> =
        (deck.mainBoard ?? deck.mainboard ?? []).map((c: Record<string, unknown>) => ({
          name: String(c.name ?? c.cardName ?? ''),
          count: Number(c.count ?? c.quantity ?? 1),
          colors: c.colors as string[] | undefined,
        }));
      const sideboard: Array<{ name: string; count: number }> =
        (deck.sideBoard ?? deck.sideboard ?? []).map((c: Record<string, unknown>) => ({
          name: String(c.name ?? c.cardName ?? ''),
          count: Number(c.count ?? c.quantity ?? 1),
        }));
      const commander = deck.commander?.[0]?.name ?? null;
      const colors = extractColors(mainboard as Array<{ colors?: string[] }>);

      // Insert deck
      const { data: deckRow, error: deckErr } = await supabase
        .from('community_decks')
        .insert({
          name: String(deck.name ?? deckCode),
          format,
          source: 'mtgjson',
          source_id: deckCode,
          commander,
          colors,
          event_name: deck.releaseDate ? `Release: ${deck.releaseDate}` : null,
        })
        .select('id')
        .single();

      if (deckErr || !deckRow) {
        log.warn('Deck insert failed', { deckCode, error: deckErr?.message });
        skipped++;
        continue;
      }

      // Batch resolve oracle IDs
      const allCards = [
        ...mainboard.map((c) => ({ ...c, board: 'mainboard' })),
        ...sideboard.map((c) => ({ ...c, board: 'sideboard' })),
      ];
      const cardNames = allCards.map((c) => c.name).filter(Boolean);
      const oracleMap = await batchResolveOracleIds(cardNames);

      const cardRows = allCards
        .filter((c) => c.name)
        .map((card) => ({
          deck_id: deckRow.id,
          card_name: card.name,
          scryfall_oracle_id: oracleMap.get(card.name) ?? null,
          quantity: card.count,
          board: card.board,
        }));

      if (cardRows.length > 0) {
        const { error: cardsErr } = await supabase
          .from('community_deck_cards')
          .insert(cardRows);
        if (cardsErr) {
          log.warn('Card insert failed', { deckCode, error: cardsErr.message });
        }
      }

      imported++;
    }

    const hasMore = offset + limit < allDecks.length;
    log.info(`MTGJSON batch complete: imported=${imported}, skipped=${skipped}, hasMore=${hasMore}`);

    return new Response(
      JSON.stringify({
        success: true,
        imported,
        skipped,
        total: allDecks.length,
        nextOffset: hasMore ? offset + limit : null,
        hasMore,
      }),
      { status: 200, headers }
    );
  } catch (e) {
    log.error('mtgjson-import error', e);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers }
    );
  }
});
