/**
 * spicerack-import — Fetches tournament decklists from Spicerack's
 * public decklist database API and stores them in community_decks.
 *
 * Documented endpoint: GET https://api.spicerack.gg/api/export-decklists/
 * Auth: X-API-Key header
 *
 * @module functions/spicerack-import
 */

// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, validateAuth } from '../_shared/auth.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('spicerack-import');
const SCRYFALL_DELAY_MS = 100;
const SCRYFALL_BATCH_SIZE = 75;

/** Map Spicerack format strings to our lowercase format names. */
const FORMAT_MAP: Record<string, string> = {
  STANDARD: 'standard',
  MODERN: 'modern',
  PIONEER: 'pioneer',
  LEGACY: 'legacy',
  VINTAGE: 'vintage',
  COMMANDER2: 'commander',
  PAUPER: 'pauper',
  BOOSTER_DRAFT: 'draft',
  SEALED_DECK: 'sealed',
  HISTORIC: 'historic',
  EXPLORER: 'explorer',
  TIMELESS: 'timeless',
  DUEL: 'duel',
  OATHBREAKER: 'oathbreaker',
  PREMODERN: 'premodern',
  PAUPER_COMMANDER: 'paupercommander',
  OLDSCHOOL: 'oldschool',
  OTHER: 'other',
  GLADIATOR: 'gladiator',
  STANDARD_BRAWL: 'standardbrawl',
  PREDH: 'predh',
  TRIOS_CONSTRUCTED: 'other',
};

/**
 * Parse a plaintext decklist (MTGO/Arena format) into card entries.
 * Expected lines: "2 Lightning Bolt" or "1x Sol Ring"
 */
function parseDecklistText(text: string): { name: string; quantity: number; board: string }[] {
  if (!text || typeof text !== 'string') return [];

  const cards: { name: string; quantity: number; board: string }[] = [];
  let currentBoard = 'mainboard';

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    // Detect sideboard header
    if (/^sideboard/i.test(line) || line === 'SB:') {
      currentBoard = 'sideboard';
      continue;
    }

    // Match "2 Card Name" or "2x Card Name" or "SB: 1 Card Name"
    const sbPrefix = line.startsWith('SB:') ? 'sideboard' : null;
    const cleaned = sbPrefix ? line.slice(3).trim() : line;
    const match = cleaned.match(/^(\d+)x?\s+(.+)$/);
    if (!match) continue;

    const quantity = parseInt(match[1], 10);
    const name = match[2].trim();
    if (name && quantity > 0) {
      cards.push({ name, quantity, board: sbPrefix ?? currentBoard });
    }
  }

  return cards;
}

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

  // Auth guard: accept anon key (for pg_cron) or service role
  const auth = await validateAuth(req);
  if (!auth.authorized) {
    return new Response(JSON.stringify({ error: auth.error }), { status: 401, headers });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const spicerackApiKey = Deno.env.get('SPICERACK_API_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Not configured' }), { status: 500, headers });
  }

  if (!spicerackApiKey) {
    return new Response(
      JSON.stringify({ error: 'SPICERACK_API_KEY not configured' }),
      { status: 500, headers },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json().catch(() => ({}));
    const numDays = body.num_days ?? 14;
    const eventFormat = body.event_format ?? null; // e.g. "MODERN", "COMMANDER2"

    // Build API URL with query params
    const apiUrl = new URL('https://api.spicerack.gg/api/export-decklists/');
    apiUrl.searchParams.set('num_days', String(numDays));
    apiUrl.searchParams.set('decklist_as_text', 'true');
    if (eventFormat) {
      apiUrl.searchParams.set('event_format', eventFormat);
    }

    log.info(`Fetching Spicerack tournaments: ${apiUrl.toString()}`);

    const apiResp = await fetch(apiUrl.toString(), {
      headers: {
        'Accept': 'application/json',
        'X-API-Key': spicerackApiKey,
      },
    });

    if (!apiResp.ok) {
      const text = await apiResp.text();
      if (apiResp.status === 404) {
        return new Response(
          JSON.stringify({ success: true, message: 'Spicerack API not available', imported: 0 }),
          { status: 200, headers },
        );
      }
      throw new Error(`Spicerack API error: ${apiResp.status} ${text.slice(0, 200)}`);
    }

    const tournaments = await apiResp.json();

    if (!Array.isArray(tournaments) || tournaments.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No tournaments returned', imported: 0, tournaments: 0 }),
        { status: 200, headers },
      );
    }

    let imported = 0;
    let skipped = 0;
    let tournamentsProcessed = 0;

    for (const tournament of tournaments) {
      const tid = String(tournament.TID ?? '');
      const tournamentName = String(tournament.tournamentName ?? 'Unknown Event');
      const format = FORMAT_MAP[tournament.format] ?? String(tournament.format ?? 'unknown').toLowerCase();
      const startDate = tournament.startDate
        ? new Date(tournament.startDate * 1000).toISOString().split('T')[0]
        : null;
      const standings = tournament.standings ?? [];

      if (!Array.isArray(standings)) continue;
      tournamentsProcessed++;

      for (const standing of standings) {
        const playerName = String(standing.name ?? 'Unknown');
        // Use TID + player name as unique source_id
        const sourceId = `${tid}-${playerName}`.slice(0, 200);

        // Skip if already imported
        const { data: existing } = await supabase
          .from('community_decks')
          .select('id')
          .eq('source', 'spicerack')
          .eq('source_id', sourceId)
          .maybeSingle();

        if (existing) { skipped++; continue; }

        // Parse the decklist text
        const decklistText = standing.decklist_text ?? '';
        const cards = parseDecklistText(decklistText);

        if (cards.length === 0) { skipped++; continue; }

        // Build deck name: "PlayerName — EventName (Format)"
        const deckName = `${playerName} — ${tournamentName}`.slice(0, 200);

        // Determine record string
        const record = [
          standing.winsSwiss ?? 0,
          standing.lossesSwiss ?? 0,
          standing.draws ?? 0,
        ].join('-');

        const { data: deckRow, error: deckErr } = await supabase
          .from('community_decks')
          .insert({
            name: deckName,
            format,
            source: 'spicerack',
            source_id: sourceId,
            commander: null, // Spicerack doesn't separate commander
            colors: [],
            event_name: tournamentName,
            event_date: startDate,
          })
          .select('id')
          .single();

        if (deckErr || !deckRow) {
          log.warn('Deck insert failed', { sourceId, error: deckErr?.message });
          skipped++;
          continue;
        }

        // Batch resolve oracle IDs for all cards
        const cardNames = cards.map((c) => c.name).filter(Boolean);
        const oracleMap = await batchResolveOracleIds(cardNames);

        const cardRows = cards
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
    }

    log.info(`Spicerack import: tournaments=${tournamentsProcessed}, imported=${imported}, skipped=${skipped}`);

    return new Response(
      JSON.stringify({ success: true, imported, skipped, tournaments: tournamentsProcessed }),
      { status: 200, headers },
    );
  } catch (e) {
    log.error('spicerack-import error', e);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers },
    );
  }
});
