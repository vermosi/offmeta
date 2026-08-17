/**
 * "Alternatives to X" search intent.
 *
 * Queries like "budget alternatives to rhystic study" are not card names and
 * are not keyword searches — they name a *reference card* and ask for
 * functionally similar (optionally cheaper) cards. Without this handler the
 * pipeline degrades to an exact-name search for the whole sentence
 * (`!"budget alternatives to rhystic study"`), which always returns zero
 * results.
 *
 * Resolution is deterministic: extract the reference card, resolve it on
 * Scryfall, then reuse the existing `card-similarity` edge function to build
 * the similar/budget query.
 *
 * @module lib/search/alternatives
 */

import { supabase } from '@/integrations/supabase/client';
import { getCardByName, searchCards } from '@/lib/scryfall/client';
import { logger } from '@/lib/core/logger';
import type { ScryfallCard } from '@/types/card';
import {
  mergePlanCandidates,
  rankSimilarityCandidates,
} from '@/lib/recommendations/ranking';
import type {
  QueryPlan,
  RecommendationConstraints,
  RecommendationIntent,
} from '@/types/recommendations';

/**
 * Which wrapper phrasing produced the intent. Recorded in telemetry so we can
 * see which phrasings users actually type and which ones fail to resolve.
 */
export type AlternativesIntentKind =
  | 'alternatives_to'
  | 'similar_to'
  | 'cards_like'
  | 'but_cheaper'
  | 'budget_version_of'
  | 'trailing_alternatives';

export interface AlternativesIntent {
  /** The reference card named in the query (may contain typos). */
  cardName: string;
  /** True when the user asked for a cheaper option ("budget", "cheaper"). */
  budget: boolean;
  /** Explicit user price ceiling, when present. */
  maxPrice?: number;
  /** Explicit format qualifier normalized to Scryfall's format name. */
  format?: string;
  /** The wrapper phrasing that matched. */
  kind: AlternativesIntentKind;
  /**
   * Set when the query names a card *category* ("fetch land", "board wipe")
   * rather than a specific card. Resolved deterministically, no card lookup.
   */
  category?: string;
}

export interface ResolvedAlternatives {
  /** Scryfall query returning alternatives to the reference card. */
  scryfallQuery: string;
  /** Canonical name of the reference card, or the category phrase. */
  cardName: string;
  budget: boolean;
  maxPrice?: number;
  format?: string;
  kind: AlternativesIntentKind;
  /** Present when resolution came from the category table. */
  category?: string;
  /** Fused and reranked V2 cards; category searches still use Scryfall directly. */
  recommendationCards?: ScryfallCard[];
}

const BUDGET_WORDS =
  /\b(budget|cheap|cheaper|affordable|inexpensive|poor\s+man'?s)\b/i;
const PRICE_CEILING =
  /\s+(?:under|below|less\s+than|max(?:imum)?|up\s+to)\s*\$?\s*(\d+(?:\.\d{1,2})?)\s*(?:usd|dollars?)?\s*$/i;

/**
 * Wrapper phrases that mean "cards like X". Group 1 is always the card name.
 */
const ALTERNATIVES_PATTERNS: Array<{
  kind: AlternativesIntentKind;
  pattern: RegExp;
}> = [
  {
    kind: 'alternatives_to',
    pattern:
      /^(?:what(?:'s| is| are)?\s+)?(?:the\s+)?(?:best\s+)?(?:budget|cheap|cheaper|affordable|inexpensive)?\s*(?:alternatives?|replacements?|substitutes?|swaps?|options?)\s+(?:to|for)\s+(.+)$/i,
  },
  {
    kind: 'similar_to',
    pattern: /^(?:cards?\s+)?(?:similar|comparable)\s+to\s+(.+)$/i,
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
  {
    kind: 'trailing_alternatives',
    pattern:
      /^(.+?)\s+(?:budget|cheap|cheaper)?\s*(?:alternatives?|replacements?|substitutes?)$/i,
  },
];

/** Trailing qualifiers that are not part of the card name. */
const TRAILING_NOISE =
  /\s+\b(?:in|for)\s+(?:commander|edh|modern|legacy|pioneer|standard|pauper|vintage|brawl)\b.*$/i;
const FORMAT_QUALIFIER =
  /\s+\b(?:in|for)\s+(commander|edh|modern|legacy|pioneer|standard|pauper|vintage|brawl)\b/i;

/** Leading budget adjectives ("budget fetch land alternatives"). */
const LEADING_BUDGET =
  /^(?:budget|cheap|cheaper|affordable|inexpensive|poor\s+man'?s)\s+/i;

/**
 * Card *categories* people ask for alternatives to. These are not card names,
 * so they must never reach the exact-name path — each maps to a deterministic
 * Scryfall query instead.
 */
const CATEGORY_QUERIES: Record<string, string> = {
  'fetch land': 't:land o:"search your library" o:"shuffle"',
  'shock land': 't:land o:"2 damage to you" o:"enters"',
  'dual land': 't:land o:"add" o:"or" -t:basic',
  'pain land': 't:land o:"1 damage to you"',
  'fast land': 't:land o:"unless you control two or fewer other lands"',
  'check land': 't:land o:"unless you control a"',
  'utility land': 't:land -t:basic',
  'man land': 't:land o:"becomes a" o:creature',
  'board wipe': 'otag:sweeper',
  'mass removal': 'otag:sweeper',
  'spot removal': 'otag:removal -otag:sweeper',
  removal: 'otag:removal',
  counterspell: 'otag:counterspell',
  'mana rock': 't:artifact otag:manarock',
  'mana dork': 't:creature otag:manadork',
  ramp: 'otag:ramp',
  tutor: 'otag:tutor',
  'card draw': 'otag:draw',
  cantrip: 'otag:cantrip',
  'sac outlet': 'otag:sacoutlet',
  'sacrifice outlet': 'otag:sacoutlet',
  wrath: 'otag:sweeper',
  'graveyard hate': 'otag:graveyard-hate',
  'artifact removal': 'otag:removal o:artifact',
  'enchantment removal': 'otag:removal o:enchantment',
};

/** Price ceiling applied when the user asks for a budget option. */
const BUDGET_CEILING = 'usd<=5';

function normalizeCategoryTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/\b(cards?|lands?|spells?)$/i, (m) =>
      m.toLowerCase() === 'cards' || m.toLowerCase() === 'card' ? '' : m,
    )
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/s$/, '');
}

/** Resolves a category phrase ("fetch land") to a Scryfall query. */
export function resolveCategoryQuery(
  term: string,
  budget: boolean,
  maxPrice?: number,
  format?: string,
): string | null {
  const normalized = normalizeCategoryTerm(term);
  const base =
    CATEGORY_QUERIES[normalized] ??
    CATEGORY_QUERIES[normalized.replace(/\s+/g, '')] ??
    null;
  if (!base) return null;
  const priceClause = maxPrice
    ? `usd<=${maxPrice}`
    : budget
      ? BUDGET_CEILING
      : null;
  return [base, priceClause, format ? `f:${format}` : null, 'game:paper']
    .filter(Boolean)
    .join(' ');
}

function cleanCardName(raw: string): string {
  return raw
    .trim()
    .replace(TRAILING_NOISE, '')
    .replace(/^["']|["']$/g, '')
    .replace(/[?.!]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detects an "alternatives to <card>" intent. Returns null for ordinary
 * keyword searches so the normal pipeline is untouched.
 */
export function detectAlternativesIntent(
  query: string,
): AlternativesIntent | null {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length > 120) return null;
  // Scryfall operators mean the user already wrote syntax — leave it alone.
  if (/[():!<>=]/.test(trimmed)) return null;

  const priceMatch = trimmed.match(PRICE_CEILING);
  const formatMatch = trimmed.match(FORMAT_QUALIFIER);
  const format =
    formatMatch?.[1].toLowerCase() === 'edh'
      ? 'commander'
      : formatMatch?.[1].toLowerCase();
  const maxPrice = priceMatch ? Number(priceMatch[1]) : undefined;
  const queryWithoutPrice = priceMatch
    ? trimmed.replace(PRICE_CEILING, '').trim()
    : trimmed;
  const queryForPattern = formatMatch
    ? queryWithoutPrice.replace(FORMAT_QUALIFIER, '').trim()
    : queryWithoutPrice;

  for (const { kind, pattern } of ALTERNATIVES_PATTERNS) {
    const match = queryForPattern.match(pattern);
    if (!match) continue;

    const cardName = cleanCardName(match[1] ?? '');
    const words = cardName.split(/\s+/).filter(Boolean);
    // A reference card name is short and is not itself a description.
    if (words.length < 1 || words.length > 6) continue;
    if (cardName.length < 3) continue;

    const budget = BUDGET_WORDS.test(trimmed) || maxPrice !== undefined;

    // "budget fetch land alternatives" names a category, not a card. Strip the
    // leading budget adjective and check the category table before rejecting.
    const stripped = cardName.replace(LEADING_BUDGET, '').trim();
    const category = resolveCategoryQuery(stripped, budget, maxPrice)
      ? normalizeCategoryTerm(stripped)
      : null;
    if (category) {
      return {
        cardName: stripped,
        budget,
        kind,
        category,
        maxPrice,
        ...(format ? { format } : {}),
      };
    }

    if (BUDGET_WORDS.test(cardName)) continue;

    return {
      cardName,
      budget,
      kind,
      maxPrice,
      ...(format ? { format } : {}),
    };
  }

  return null;
}

/** Excludes the reference card from its own alternatives list. */
function excludeSelf(query: string, cardName: string): string {
  const safe = cardName.replace(/["()]/g, '').trim();
  if (!safe) return query;
  const exclusion = `-!"${safe}"`;
  return query.includes(exclusion) ? query : `${query} ${exclusion}`.trim();
}

/**
 * Resolves an "alternatives to X" query into a real Scryfall query.
 * Returns null when the intent doesn't apply or the card can't be resolved,
 * so callers can fall through to their existing behaviour.
 */
export async function resolveAlternativesQuery(
  query: string,
  constraints: RecommendationConstraints = {},
): Promise<ResolvedAlternatives | null> {
  const intent = detectAlternativesIntent(query);
  if (!intent) return null;

  // Category phrases resolve without touching Scryfall or the similarity
  // function — there is no single reference card to look up.
  if (intent.category) {
    const categoryQuery = resolveCategoryQuery(
      intent.category,
      intent.budget,
      intent.maxPrice,
      intent.format ?? constraints.format,
    );
    if (!categoryQuery) return null;
    return {
      scryfallQuery: categoryQuery,
      cardName: intent.cardName,
      budget: intent.budget,
      maxPrice: intent.maxPrice,
      kind: intent.kind,
      category: intent.category,
      format: intent.format ?? constraints.format,
    };
  }

  let card: ScryfallCard;
  try {
    card = await getCardByName(intent.cardName);
  } catch {
    // Unknown reference card — the fuzzy-name recovery path handles this.
    return null;
  }

  try {
    const { data, error } = await supabase.functions.invoke('card-similarity', {
      body: {
        cardName: card.name,
        typeLine: card.type_line,
        oracleText: card.oracle_text,
        colorIdentity: card.color_identity,
        keywords: (card as unknown as { keywords?: string[] }).keywords ?? [],
        cmc: card.cmc,
        prices: card.prices,
        explicitMaxPrice: intent.maxPrice,
      },
    });

    if (error || !data?.success) {
      logger.warn('Alternatives resolution failed', error || data?.error);
      return null;
    }

    const effectiveConstraints: RecommendationConstraints = {
      ...constraints,
      ...(intent.format ? { format: intent.format } : {}),
      ...(intent.maxPrice !== undefined ? { maxPrice: intent.maxPrice } : {}),
    };
    const constraintClauses = [
      effectiveConstraints.format ? `f:${effectiveConstraints.format}` : '',
      effectiveConstraints.colors?.length
        ? `id<=${effectiveConstraints.colors.join('')}`
        : '',
      ...(effectiveConstraints.types ?? []).map((type) => `t:${type}`),
      effectiveConstraints.minManaValue !== undefined
        ? `mv>=${effectiveConstraints.minManaValue}`
        : '',
      effectiveConstraints.maxManaValue !== undefined
        ? `mv<=${effectiveConstraints.maxManaValue}`
        : '',
    ].filter(Boolean);
    const withConstraints = (value: string | undefined) =>
      value ? [value, ...constraintClauses].join(' ') : undefined;

    const chosen: string | undefined = intent.budget
      ? data.budgetQuery
      : data.similarQuery || data.budgetQuery;
    if (!chosen) return null;

    const plans = Array.isArray(data.queryPlans)
      ? (data.queryPlans as QueryPlan[]).slice(0, 4).map((plan) => ({
          ...plan,
          query: withConstraints(plan.query) ?? plan.query,
        }))
      : [];
    const edgeIntent = data.intent as RecommendationIntent | undefined;
    const recommendationIntent = edgeIntent
      ? { ...edgeIntent, hardConstraints: effectiveConstraints }
      : undefined;
    let recommendationCards: ScryfallCard[] | undefined;
    if (plans.length > 0 && recommendationIntent?.version === 'v2') {
      const activePlans = [...plans];
      const resultSets = await Promise.all(
        activePlans.map((plan) => searchCards(plan.query, 1)),
      );
      let candidates = mergePlanCandidates(
        activePlans,
        resultSets.map((result) => result.data),
      );
      let ranked = rankSimilarityCandidates(
        card,
        candidates,
        activePlans,
        recommendationIntent,
      );
      const selected = intent.budget ? ranked.budget : ranked.similar;
      const needsRecovery =
        candidates.length < 20 ||
        (selected[0]?.breakdown.confidence ?? 0) < 0.5;
      const rawRecoveryPlan = data.recoveryPlan as QueryPlan | undefined;
      const recoveryPlan = rawRecoveryPlan
        ? {
            ...rawRecoveryPlan,
            query:
              withConstraints(rawRecoveryPlan.query) ?? rawRecoveryPlan.query,
          }
        : undefined;
      if (needsRecovery && recoveryPlan && activePlans.length < 5) {
        const recoveryResult = await searchCards(recoveryPlan.query, 1);
        activePlans.push(recoveryPlan);
        candidates = mergePlanCandidates(activePlans, [
          ...resultSets.map((result) => result.data),
          recoveryResult.data,
        ]);
        ranked = rankSimilarityCandidates(
          card,
          candidates,
          activePlans,
          recommendationIntent,
        );
      }
      recommendationCards = (intent.budget ? ranked.budget : ranked.similar)
        .slice(0, 100)
        .map((entry) => entry.card);
    }

    return {
      scryfallQuery: excludeSelf(withConstraints(chosen) ?? chosen, card.name),
      cardName: card.name,
      budget: intent.budget,
      maxPrice: intent.maxPrice,
      kind: intent.kind,
      recommendationCards,
      format: effectiveConstraints.format,
    };
  } catch (err) {
    logger.warn('Alternatives resolution threw', err);
    return null;
  }
}
