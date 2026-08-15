/**
 * "cards like X" handling for the Discord bot.
 *
 * The semantic-search translator decomposes a *card name* into oracle-text
 * fragments ("cards like rhystic study" → o:"whenever" o:"opponent" ...), which
 * produces noisy, unhelpful results. This module detects the alternatives
 * intent, resolves the reference card on Scryfall, and reuses the
 * `card-similarity` edge function to build a real similarity query.
 */

export type AlternativesKind =
  | 'alternatives_to'
  | 'similar_to'
  | 'cards_like'
  | 'but_cheaper'
  | 'budget_version_of';

export interface AlternativesIntent {
  cardName: string;
  budget: boolean;
  kind: AlternativesKind;
}

const BUDGET_WORDS =
  /\b(budget|cheap|cheaper|affordable|inexpensive|poor\s+man'?s)\b/i;

const PATTERNS: Array<{ kind: AlternativesKind; pattern: RegExp }> = [
  {
    kind: 'alternatives_to',
    pattern:
      /^(?:what(?:'s| is| are)?\s+)?(?:the\s+)?(?:best\s+)?(?:budget|cheap|cheaper|affordable|inexpensive)?\s*(?:alternatives?|replacements?|substitutes?|swaps?)\s+(?:to|for)\s+(.+)$/i,
  },
  {
    kind: 'similar_to',
    pattern:
      /^(?:cards?\s+)?(?:that\s+are\s+)?(?:similar|comparable)\s+to\s+(.+)$/i,
  },
  { kind: 'cards_like', pattern: /^(?:cards?\s+)?like\s+(.+)$/i },
  {
    kind: 'but_cheaper',
    pattern:
      /^(.+?)\s+(?:but|except)\s+(?:cheaper|budget|less\s+expensive|more\s+affordable)$/i,
  },
  {
    kind: 'budget_version_of',
    pattern:
      /^(?:budget|cheap|cheaper|affordable|inexpensive)\s+(?:version|copy)\s+of\s+(.+)$/i,
  },
];

const TRAILING_NOISE =
  /\s+\b(?:in|for)\s+(?:commander|edh|modern|legacy|pioneer|standard|pauper|vintage|brawl)\b.*$/i;

function cleanCardName(raw: string): string {
  return raw
    .trim()
    .replace(TRAILING_NOISE, '')
    .replace(/^["']|["']$/g, '')
    .replace(/[?.!]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Detects an "alternatives to <card>" intent, or null for normal searches. */
export function detectAlternativesIntent(
  query: string,
): AlternativesIntent | null {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length > 120) return null;
  // Already Scryfall syntax — leave it alone.
  if (/[():!<>=]/.test(trimmed)) return null;

  for (const { kind, pattern } of PATTERNS) {
    const match = trimmed.match(pattern);
    if (!match) continue;

    const cardName = cleanCardName(match[1] ?? '');
    const words = cardName.split(/\s+/).filter(Boolean);
    if (words.length < 1 || words.length > 6) continue;
    if (cardName.length < 3) continue;
    if (BUDGET_WORDS.test(cardName)) continue;

    return { cardName, budget: BUDGET_WORDS.test(trimmed), kind };
  }

  return null;
}

/** Excludes the reference card from its own alternatives list. */
export function excludeSelf(query: string, cardName: string): string {
  const safe = cardName.replace(/["()]/g, '').trim();
  if (!safe) return query;
  const exclusion = `-!"${safe}"`;
  return query.includes(exclusion) ? query : `${query} ${exclusion}`.trim();
}

interface ScryfallNamedCard {
  name: string;
  type_line?: string;
  oracle_text?: string;
  color_identity?: string[];
  keywords?: string[];
  cmc?: number;
  prices?: Record<string, string | null>;
}

/** Upstream budgets: the Discord follow-up must never wait indefinitely. */
const NAMED_LOOKUP_TIMEOUT_MS = 6000;
const SIMILARITY_TIMEOUT_MS = 9000;

export interface ResolvedAlternatives {
  scryfallQuery: string;
  cardName: string;
  budget: boolean;
}

/**
 * Resolves "cards like X" into a similarity Scryfall query.
 * Returns null whenever the intent doesn't apply or the reference card cannot
 * be resolved, so callers fall through to the normal translation pipeline.
 */
export async function resolveAlternativesQuery(
  query: string,
  deps: { supabaseUrl: string; serviceRoleKey: string },
): Promise<ResolvedAlternatives | null> {
  const intent = detectAlternativesIntent(query);
  if (!intent) return null;

  let card: ScryfallNamedCard;
  try {
    const res = await fetch(
      `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(
        intent.cardName,
      )}`,
      {
        headers: {
          'User-Agent': 'OffMetaDiscordBot/1.0',
          Accept: 'application/json',
        },
        // Never let a stalled upstream hold the deferred Discord reply open.
        signal: AbortSignal.timeout(NAMED_LOOKUP_TIMEOUT_MS),
      },
    );
    if (!res.ok) return null;
    card = (await res.json()) as ScryfallNamedCard;
    if (!card?.name) return null;
  } catch {
    return null;
  }

  try {
    const res = await fetch(
      `${deps.supabaseUrl}/functions/v1/card-similarity`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${deps.serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(SIMILARITY_TIMEOUT_MS),
        body: JSON.stringify({
          cardName: card.name,
          typeLine: card.type_line,
          oracleText: card.oracle_text,
          colorIdentity: card.color_identity ?? [],
          keywords: card.keywords ?? [],
          cmc: card.cmc,
          prices: card.prices,
        }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      success?: boolean;
      similarQuery?: string;
      budgetQuery?: string;
    };
    if (!data.success) return null;

    const chosen = intent.budget
      ? data.budgetQuery || data.similarQuery
      : data.similarQuery || data.budgetQuery;
    if (!chosen) return null;

    return {
      scryfallQuery: excludeSelf(chosen, card.name),
      cardName: card.name,
      budget: intent.budget,
    };
  } catch {
    return null;
  }
}
