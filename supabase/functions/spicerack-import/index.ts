/**
 * spicerack-import — Fetches tournament decklists from Spicerack's
 * public decklist database API and stores them in community_decks.
 *
 * Documented endpoint: GET https://api.spicerack.gg/api/export-decklists/
 * Auth: X-API-Key header
 *
 * @module functions/spicerack-import
 */


import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, requireServiceRole } from '../_shared/auth.ts';
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

const MOXFIELD_DELAY_MS = 150;

/**
 * Fetch a decklist from a Moxfield URL and return parsed card entries.
 */
async function fetchMoxfieldDeck(
  url: string,
): Promise<{ cards: { name: string; quantity: number; board: string }[]; commander: string | null; colors: string[] }> {
  const match = url.match(/moxfield\.com\/decks\/([A-Za-z0-9_-]+)/);
  if (!match) return { cards: [], commander: null, colors: [] };

  const publicId = match[1];
  try {
    const resp = await fetch(`https://api2.moxfield.com/v3/decks/all/${publicId}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'OffMeta/1.0 (spicerack-import)',
      },
    });

    if (!resp.ok) {
      await resp.text();
      return { cards: [], commander: null, colors: [] };
    }

    const deck = await resp.json();
    const boards = deck.boards ?? deck;
    const cards: { name: string; quantity: number; board: string }[] = [];
    const commanders: string[] = [];

    // Extract commanders
    const cmdBoard = boards.commanders;
    if (cmdBoard) {
      const cmdCards = cmdBoard.cards ?? cmdBoard;
      if (cmdCards && typeof cmdCards === 'object') {
        for (const key of Object.keys(cmdCards)) {
          const entry = cmdCards[key];
          const name = entry?.card?.name ?? entry?.name;
          const qty = entry?.quantity ?? 1;
          if (name) {
            commanders.push(name);
            cards.push({ name, quantity: qty, board: 'commander' });
          }
        }
      }
    }

    // Extract mainboard + sideboard + companions
    for (const [boardName, boardKey] of [['mainboard', 'mainboard'], ['sideboard', 'sideboard'], ['companions', 'companion']] as const) {
      const board = boards[boardName];
      if (!board || typeof board !== 'object') continue;
      const boardCards = board.cards ?? board;
      if (!boardCards || typeof boardCards !== 'object') continue;
      for (const key of Object.keys(boardCards)) {
        const entry = boardCards[key];
        if (!entry || typeof entry !== 'object') continue;
        const name = entry?.card?.name ?? entry?.name;
        const qty = entry?.quantity ?? 1;
        if (name) cards.push({ name, quantity: qty, board: boardKey });
      }
    }

    const colors: string[] = Array.isArray(deck.colorIdentity)
      ? ['W', 'U', 'B', 'R', 'G'].filter((c) => deck.colorIdentity.includes(c))
      : [];

    return {
      cards,
      commander: commanders.length > 0 ? commanders.join(' // ') : null,
      colors,
    };
  } catch {
    return { cards: [], commander: null, colors: [] };
  }
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
    const backfillUrls = body.backfill_urls === true;
    const numDays = body.num_days ?? (backfillUrls ? 90 : 14);
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

    // ── Backfill source_url mode ──
    if (backfillUrls) {
      let updated = 0;
      let checked = 0;

      for (const tournament of tournaments) {
        const tid = String(tournament.TID ?? '');
        const standings = tournament.standings ?? [];
        if (!Array.isArray(standings)) continue;

        for (const standing of standings) {
          const playerName = String(standing.name ?? 'Unknown');
          const sourceId = `${tid}-${playerName}`.slice(0, 200);
          const decklistUrl = standing.decklist ?? '';

          // Only process if standing has a Moxfield URL
          if (typeof decklistUrl !== 'string' || !decklistUrl.includes('moxfield.com/decks/')) continue;
          checked++;

          // Update existing deck that has no source_url
          const { data: updatedRow } = await supabase
            .from('community_decks')
            .update({ source_url: decklistUrl })
            .eq('source', 'spicerack')
            .eq('source_id', sourceId)
            .is('source_url', null)
            .select('id')
            .maybeSingle();

          if (updatedRow) updated++;
        }
      }

      log.info(`Backfill URLs: checked=${checked}, updated=${updated}`);
      return new Response(
        JSON.stringify({ success: true, mode: 'backfill_urls', checked, updated, tournaments: tournaments.length }),
        { status: 200, headers },
      );
    }

    // ── Normal import mode ──
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

        // Try plaintext first, then Moxfield URL
        const decklistText = standing.decklist_text ?? '';
        let cards = parseDecklistText(decklistText);
        let commander: string | null = null;
        let deckColors: string[] = [];
        let sourceUrl: string | null = null;

        if (cards.length === 0) {
          // Check if decklist is a Moxfield URL
          const decklistUrl = standing.decklist ?? '';
          if (typeof decklistUrl === 'string' && decklistUrl.includes('moxfield.com/decks/')) {
            sourceUrl = decklistUrl;
            const moxResult = await fetchMoxfieldDeck(decklistUrl);
            cards = moxResult.cards;
            commander = moxResult.commander;
            deckColors = moxResult.colors;
            await new Promise((r) => setTimeout(r, MOXFIELD_DELAY_MS));
          }
        }

        if (cards.length === 0) { skipped++; continue; }

        // Build deck name
        const deckName = `${playerName} — ${tournamentName}`.slice(0, 200);

        const { data: deckRow, error: deckErr } = await supabase
          .from('community_decks')
          .insert({
            name: deckName,
            format,
            source: 'spicerack',
            source_id: sourceId,
            commander,
            colors: deckColors,
            event_name: tournamentName,
            event_date: startDate,
            source_url: sourceUrl,
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
