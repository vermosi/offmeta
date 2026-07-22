/**
 * topdeck-import — Fetches tournament decklists from TopDeck.gg's
 * public tournaments API and stores them in community_decks.
 *
 * Replaces the defunct Spicerack API.
 *
 * Endpoint: POST https://topdeck.gg/api/v2/tournaments
 * Auth: Authorization: <API_KEY> header (no Bearer prefix)
 * Docs: https://topdeck.gg/api/docs
 *
 * @module functions/topdeck-import
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, requireServiceRole } from '../_shared/auth.ts';
import { createLogger, withLogging } from '../_shared/logger.ts';

const log = createLogger('topdeck-import');
const SCRYFALL_DELAY_MS = 100;
const SCRYFALL_BATCH_SIZE = 75;
const MOXFIELD_DELAY_MS = 150;
const TOPDECK_API_URL = 'https://topdeck.gg/api/v2/tournaments';
const TOPDECK_GAME = 'Magic: The Gathering';

/** Map TopDeck.gg format strings (case sensitive) to our lowercase format names. */
const FORMAT_MAP: Record<string, string> = {
  'EDH': 'commander',
  'Pauper EDH': 'paupercommander',
  'Standard': 'standard',
  'Pioneer': 'pioneer',
  'Modern': 'modern',
  'Legacy': 'legacy',
  'Pauper': 'pauper',
  'Vintage': 'vintage',
  'Premodern': 'premodern',
  'Sealed': 'sealed',
  'Limited': 'draft',
  'Duel Commander': 'duel',
  'Old School 93/94': 'oldschool',
  'Canadian Highlander': 'other',
  'Tiny Leaders': 'other',
  'Team Trios': 'other',
  'Two-Headed Giant': 'other',
  'EDH Draft': 'commander',
  'Timeless': 'timeless',
  'Historic': 'historic',
  'Explorer': 'explorer',
  '7pt Highlander': 'other',
  'Oathbreaker': 'oathbreaker',
};

/** Default set of formats to poll per run. Override via request body. */
const DEFAULT_FORMATS = [
  'EDH',
  'Modern',
  'Pioneer',
  'Standard',
  'Legacy',
  'Pauper',
  'Vintage',
];

/**
 * Parse a plaintext decklist. Handles both MTGO/Arena format
 * ("2 Lightning Bolt", "SB: 1 Card") and TopDeck/Scrollrack format
 * with section headers like `~~Commanders~~`, `~~Sideboard~~`,
 * `~~Companions~~`, `~~Maybeboard~~`.
 */
function parseDecklistText(
  text: string,
): { name: string; quantity: number; board: string }[] {
  if (!text || typeof text !== 'string') return [];

  const cards: { name: string; quantity: number; board: string }[] = [];
  let currentBoard = 'mainboard';

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    // TopDeck/Scrollrack section markers: ~~Section Name~~
    const sectionMatch = line.match(/^~~\s*(.+?)\s*~~$/);
    if (sectionMatch) {
      const section = sectionMatch[1].toLowerCase();
      if (section.startsWith('commander')) currentBoard = 'commander';
      else if (section.startsWith('sideboard')) currentBoard = 'sideboard';
      else if (section.startsWith('companion')) currentBoard = 'companion';
      else if (section.startsWith('maybe')) currentBoard = 'maybeboard';
      else if (section.startsWith('token')) currentBoard = 'tokens';
      else if (section.startsWith('signature')) currentBoard = 'signature';
      else currentBoard = 'mainboard';
      continue;
    }

    // MTGO-style sideboard header
    if (/^sideboard/i.test(line) || line === 'SB:') {
      currentBoard = 'sideboard';
      continue;
    }

    const sbPrefix = line.startsWith('SB:') ? 'sideboard' : null;
    const cleaned = sbPrefix ? line.slice(3).trim() : line;
    const match = cleaned.match(/^(\d+)x?\s+(.+)$/);
    if (!match) continue;

    const quantity = parseInt(match[1], 10);
    // Strip trailing set codes like "(NEO) 123" or "*F*"
    let name = match[2].trim();
    name = name.replace(/\s+\([A-Z0-9]{2,6}\)(\s+\S+)?$/, '').trim();
    name = name.replace(/\s+\*F\*$/i, '').trim();
    if (name && quantity > 0) {
      cards.push({ name, quantity, board: sbPrefix ?? currentBoard });
    }
  }

  return cards;
}

/**
 * Fetch a decklist from a Moxfield URL — fallback when TopDeck standings
 * link out instead of embedding plaintext.
 */
async function fetchMoxfieldDeck(
  url: string,
): Promise<{
  cards: { name: string; quantity: number; board: string }[];
  commander: string | null;
  colors: string[];
}> {
  const match = url.match(/moxfield\.com\/decks\/([A-Za-z0-9_-]+)/);
  if (!match) return { cards: [], commander: null, colors: [] };

  const publicId = match[1];
  try {
    const resp = await fetch(
      `https://api2.moxfield.com/v3/decks/all/${publicId}`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'OffMeta/1.0 (topdeck-import)',
        },
      },
    );

    if (!resp.ok) {
      await resp.text();
      return { cards: [], commander: null, colors: [] };
    }

    const deck = await resp.json();
    const boards = deck.boards ?? deck;
    const cards: { name: string; quantity: number; board: string }[] = [];
    const commanders: string[] = [];

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

    for (const [boardName, boardKey] of [
      ['mainboard', 'mainboard'],
      ['sideboard', 'sideboard'],
      ['companions', 'companion'],
    ] as const) {
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
 * Derive commander name(s) and color identity from a parsed decklist
 * when the source did not provide structured deck data.
 */
function deriveCommanderAndColors(
  cards: { name: string; quantity: number; board: string }[],
  deckObj: unknown,
): { commander: string | null; colors: string[] } {
  const commanders = cards.filter((c) => c.board === 'commander').map((c) => c.name);
  const commander = commanders.length > 0 ? commanders.join(' // ') : null;

  let colors: string[] = [];
  if (
    deckObj &&
    typeof deckObj === 'object' &&
    Array.isArray((deckObj as { colorIdentity?: unknown }).colorIdentity)
  ) {
    const ci = (deckObj as { colorIdentity: unknown[] }).colorIdentity;
    colors = ['W', 'U', 'B', 'R', 'G'].filter((c) => ci.includes(c));
  }
  return { commander, colors };
}

/**
 * Batch-resolve oracle IDs — checks local cards table first, falls back to Scryfall.
 */
async function batchResolveOracleIds(
  cardNames: string[],
  supabase: ReturnType<typeof createClient>,
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  const unique = [...new Set(cardNames)];

  const missing: string[] = [];
  for (let i = 0; i < unique.length; i += 100) {
    const batch = unique.slice(i, i + 100);
    try {
      const { data } = await supabase
        .from('cards')
        .select('name, oracle_id')
        .in('name', batch);

      if (data) {
        for (const row of data) {
          result.set(row.name, row.oracle_id);
        }
      }
    } catch {
      /* continue */
    }

    for (const name of batch) {
      if (!result.has(name)) missing.push(name);
    }
  }

  if (missing.length === 0) return result;

  log.info(
    `Resolving ${missing.length}/${unique.length} oracle IDs from Scryfall (not in local DB)`,
  );
  for (let i = 0; i < missing.length; i += SCRYFALL_BATCH_SIZE) {
    const batch = missing.slice(i, i + SCRYFALL_BATCH_SIZE);
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

    if (i + SCRYFALL_BATCH_SIZE < missing.length) {
      await new Promise((r) => setTimeout(r, SCRYFALL_DELAY_MS));
    }
  }

  return result;
}

/** Fetch tournaments for a single TopDeck.gg format. */
async function fetchTopdeckFormat(
  format: string,
  numDays: number,
  apiKey: string,
): Promise<unknown[]> {
  const resp = await fetch(TOPDECK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({
      game: TOPDECK_GAME,
      format,
      last: numDays,
      columns: ['name', 'decklist', 'wins', 'draws', 'losses'],
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    log.warn(`TopDeck API error for format=${format}`, {
      status: resp.status,
      body: text.slice(0, 200),
    });
    if (resp.status === 404) return [];
    throw new Error(`TopDeck API ${resp.status}: ${text.slice(0, 200)}`);
  }

  const data = await resp.json();
  return Array.isArray(data) ? data : [];
}

serve(withLogging('topdeck-import', async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authCheck = requireServiceRole(req, corsHeaders);
  if (!authCheck.authorized) {
    return authCheck.response;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const topdeckApiKey = Deno.env.get('TOPDECK_API_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Not configured' }), {
      status: 500,
      headers,
    });
  }

  if (!topdeckApiKey) {
    return new Response(
      JSON.stringify({ error: 'TOPDECK_API_KEY not configured' }),
      { status: 500, headers },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json().catch(() => ({}));
    const numDays: number = body.num_days ?? 14;
    const requestedFormats: string[] = Array.isArray(body.formats) && body.formats.length > 0
      ? body.formats
      : DEFAULT_FORMATS;

    // Aggregate tournaments across all requested formats.
    const tournaments: unknown[] = [];
    for (const fmt of requestedFormats) {
      try {
        const list = await fetchTopdeckFormat(fmt, numDays, topdeckApiKey);
        tournaments.push(...list);
        // Modest pacing to stay under rate limits.
        await new Promise((r) => setTimeout(r, 400));
      } catch (e) {
        log.warn(`Skipping format=${fmt}`, { error: (e as Error).message });
      }
    }

    log.info(`TopDeck: fetched ${tournaments.length} tournaments across ${requestedFormats.length} formats`);

    if (tournaments.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No tournaments returned',
          imported: 0,
          tournaments: 0,
        }),
        { status: 200, headers },
      );
    }

    let imported = 0;
    let skipped = 0;
    let tournamentsProcessed = 0;

    interface TopdeckStanding {
      name?: string;
      decklist?: string;
      deckObj?: unknown;
      wins?: number;
      draws?: number;
      losses?: number;
    }
    interface TopdeckTournament {
      TID?: string;
      tournamentName?: string;
      format?: string;
      startDate?: number;
      standings?: TopdeckStanding[];
    }

    for (const raw of tournaments) {
      const tournament = raw as TopdeckTournament;
      const tid = String(tournament.TID ?? '');
      const tournamentName = String(tournament.tournamentName ?? 'Unknown Event');
      const rawFormat = String(tournament.format ?? '');
      const format = FORMAT_MAP[rawFormat] ?? rawFormat.toLowerCase() ?? 'unknown';
      const startDate = tournament.startDate
        ? new Date(tournament.startDate * 1000).toISOString().split('T')[0]
        : null;
      const standings = tournament.standings ?? [];

      if (!tid || !Array.isArray(standings)) continue;
      tournamentsProcessed++;

      for (const standing of standings as TopdeckStanding[]) {
        const playerName = String(standing.name ?? 'Unknown');
        const sourceId = `${tid}-${playerName}`.slice(0, 200);

        // Skip if already imported.
        const { data: existing } = await supabase
          .from('community_decks')
          .select('id')
          .eq('source', 'topdeck')
          .eq('source_id', sourceId)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }

        // TopDeck usually returns plaintext in `decklist`. If it's a URL,
        // fall through to Moxfield fetching.
        const rawDecklist = standing.decklist ?? '';
        let cards: { name: string; quantity: number; board: string }[] = [];
        let commander: string | null = null;
        let deckColors: string[] = [];
        let sourceUrl: string | null = null;

        if (typeof rawDecklist === 'string' && rawDecklist.trim().length > 0) {
          if (/^https?:\/\//i.test(rawDecklist)) {
            if (rawDecklist.includes('moxfield.com/decks/')) {
              sourceUrl = rawDecklist;
              const moxResult = await fetchMoxfieldDeck(rawDecklist);
              cards = moxResult.cards;
              commander = moxResult.commander;
              deckColors = moxResult.colors;
              await new Promise((r) => setTimeout(r, MOXFIELD_DELAY_MS));
            } else {
              sourceUrl = rawDecklist;
            }
          } else {
            cards = parseDecklistText(rawDecklist);
          }
        }

        if (cards.length === 0) {
          skipped++;
          continue;
        }

        if (!commander) {
          const derived = deriveCommanderAndColors(cards, standing.deckObj);
          commander = derived.commander;
          if (deckColors.length === 0) deckColors = derived.colors;
        }

        const deckName = `${playerName} — ${tournamentName}`.slice(0, 200);

        const { data: deckRow, error: deckErr } = await supabase
          .from('community_decks')
          .insert({
            name: deckName,
            format,
            source: 'topdeck',
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

        const cardNames = cards.map((c) => c.name).filter(Boolean);
        const oracleMap = await batchResolveOracleIds(cardNames, supabase);

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

    log.info(
      `TopDeck import: tournaments=${tournamentsProcessed}, imported=${imported}, skipped=${skipped}`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        imported,
        skipped,
        tournaments: tournamentsProcessed,
        formats: requestedFormats,
      }),
      { status: 200, headers },
    );
  } catch (e) {
    log.error('topdeck-import error', e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers },
    );
  }
});
