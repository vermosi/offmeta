/**
 * card-similarity — Builds deterministic Scryfall queries for similar cards.
 * @module functions/card-similarity
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateAuth, getCorsHeaders } from '../_shared/auth.ts';
import { checkRateLimit, maybeCleanup } from '../_shared/rateLimit.ts';
import { withLogging } from '../_shared/logger.ts';
import { deriveFunctionalTags, isStrongFingerprint } from './functional.ts';
import { budgetCeiling, buildBudgetQuery, buildSimilarQuery } from './query.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : null;

declare const Deno: {
  env: { get(key: string): string | undefined };
};

const serve = (handler: (req: Request) => Promise<Response>) => {
  // @ts-expect-error: Deno.serve exists in Deno runtime
  Deno.serve(handler);
};

interface SimilarityRequest {
  cardId?: string;
  cardName: string;
  typeLine: string;
  oracleText?: string;
  colorIdentity?: string[];
  keywords?: string[];
  cmc?: number;
  prices?: { usd?: string | null };
}

interface SimilarityResponse {
  success: boolean;
  similarQuery?: string;
  budgetQuery?: string;
  /** Scryfall oracle tags describing what the reference card does. */
  functionalTags?: string[];
  cached?: boolean;
  error?: string;
}

/** Extract key mechanical keywords from oracle text */
function extractMechanics(oracleText: string): string[] {
  const mechanics: string[] = [];
  const patterns: Array<[RegExp, string]> = [
    [/\bdraw\b/i, 'draw'],
    [/\bdestroy\b/i, 'destroy'],
    [/\bexile\b/i, 'exile'],
    [/\bcounter target\b/i, 'counter'],
    [/\bsearch your library\b/i, 'tutor'],
    [/\breturn.*from.*graveyard\b/i, 'recursion'],
    [/\bcreate.*token/i, 'tokens'],
    [/\b\+1\/\+1 counter/i, '+1/+1 counters'],
    [/\bflying\b/i, 'flying'],
    [/\blifelink\b/i, 'lifelink'],
    [/\bdeathtouch\b/i, 'deathtouch'],
    [/\btrample\b/i, 'trample'],
    [/\bhaste\b/i, 'haste'],
    [/\bflash\b/i, 'flash'],
    [/(?:\{T\}|tap).*add\b/i, 'mana production'],
    [/\badd\s+\{[WUBRGC]\}/i, 'mana production'],
    [/\bmill\b/i, 'mill'],
    [/\bdiscard\b/i, 'discard'],
    [/\bsacrifice\b/i, 'sacrifice'],
    [/\bequip\b/i, 'equipment'],
    [/\benchant\b/i, 'enchantment'],
    [/\btransform\b/i, 'transform'],
    [/\benter(s|ed)? the battlefield\b/i, 'ETB'],
    [/\bwhen(ever)?.*dies\b/i, 'death trigger'],
    [/\bprotection from\b/i, 'protection'],
    [/\bindestructible\b/i, 'indestructible'],
    [/\bhexproof\b/i, 'hexproof'],
    [/\bproliferate\b/i, 'proliferate'],
    [/\bscry\b/i, 'scry'],
    [/\buntap\b/i, 'untap'],
  ];

  for (const [regex, label] of patterns) {
    if (regex.test(oracleText)) {
      mechanics.push(label);
    }
  }
  return [...new Set(mechanics)].slice(0, 6);
}

async function getMechanicsForCard(card: SimilarityRequest): Promise<string[]> {
  const cacheKey = card.cardId || card.cardName.toLowerCase();
  if (!cacheKey) return extractMechanics(card.oracleText || '');

  const mechanics = extractMechanics(card.oracleText || '');

  if (supabase) {
    const { data: cached } = await supabase
      .from('card_mechanics_cache')
      .select('mechanics, oracle_text')
      .eq('card_id', cacheKey)
      .maybeSingle();

    if (cached?.mechanics && cached.oracle_text === (card.oracleText || '')) {
      return cached.mechanics;
    }
  }

  if (supabase) {
    await supabase.from('card_mechanics_cache').upsert({
      card_id: cacheKey,
      oracle_text: card.oracleText || '',
      mechanics,
      updated_at: new Date().toISOString(),
    });
  }

  return mechanics;
}

/** Scryfall result count for a query. Returns 0 for empty results (404) and
 * null when the lookup itself fails, so callers can distinguish "too narrow"
 * from "couldn't check".
 */
async function countResults(query: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}`,
      { headers: { 'User-Agent': 'OffMeta/1.0', Accept: 'application/json' } },
    );
    if (res.status === 404) return 0;
    if (!res.ok) return null;
    const data = (await res.json()) as { total_cards?: number };
    return typeof data.total_cards === 'number' ? data.total_cards : null;
  } catch {
    return null;
  }
}

/** Minimum results before a functional query is considered too narrow. */
const MIN_FUNCTIONAL_RESULTS = 5;

/**
 * Picks the most specific functional query that still returns enough cards:
 * both tags → primary tag only → null (caller falls back to the heuristic).
 */
async function resolveFunctionalQuery(
  card: SimilarityRequest,
  tags: string[],
): Promise<string | null> {
  const candidates =
    tags.length > 1
      ? [
          buildFunctionalQuery(card, tags),
          buildFunctionalQuery(card, [tags[0]]),
        ]
      : [buildFunctionalQuery(card, tags)];

  for (const candidate of candidates) {
    const count = await countResults(candidate);
    if (count === null || count >= MIN_FUNCTIONAL_RESULTS) return candidate;
  }
  return null;
}

/** Functional similarity query: what the card *does*, expressed with Scryfall
 * oracle tags. Type and mana value are deliberately omitted.
 */
function buildFunctionalQuery(card: SimilarityRequest, tags: string[]): string {
  const parts = tags.map((tag) => `otag:${tag}`);
  if (card.colorIdentity?.length) {
    parts.push(`id<=${card.colorIdentity.join('').toUpperCase()}`);
  }
  parts.push(`-!"${card.cardName}"`, 'game:paper');
  return parts.join(' ');
}

serve(
  withLogging('card-similarity', async (req: Request): Promise<Response> => {
    const corsHeaders = getCorsHeaders(req);
    const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers },
      );
    }

    const auth = await validateAuth(req);
    if (!auth.authorized) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers },
      );
    }

    maybeCleanup();
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateCheck = await checkRateLimit(ip, undefined, 15, 500);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Rate limited',
          retryAfter: rateCheck.retryAfter,
        }),
        { status: 429, headers },
      );
    }

    try {
      const body: SimilarityRequest = await req.json();
      const { cardName, typeLine } = body;

      if (!cardName || !typeLine) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'cardName and typeLine are required',
          }),
          { status: 400, headers },
        );
      }

      const functionalTags = deriveFunctionalTags(body);
      const functionalQuery = isStrongFingerprint(functionalTags)
        ? await resolveFunctionalQuery(body, functionalTags)
        : null;

      const mechanics = await getMechanicsForCard(body);
      const similarQuery =
        functionalQuery ?? buildSimilarQuery(body, mechanics);
      const budgetQuery = functionalQuery
        ? `${functionalQuery} usd<${budgetCeiling(body)} order:usd dir:asc`
        : buildBudgetQuery(body, mechanics);

      return new Response(
        JSON.stringify({
          success: true,
          similarQuery,
          budgetQuery,
          functionalTags,
          cached: false,
        } satisfies SimilarityResponse),
        { status: 200, headers },
      );
    } catch (e) {
      console.error('card-similarity error:', e);
      return new Response(
        JSON.stringify({ success: false, error: 'Internal error' }),
        { status: 500, headers },
      );
    }
  }),
);
