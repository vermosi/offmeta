import type { ScryfallCard } from '@/types/card';
import type { SearchIntent } from '@/types/search';
import { explainCardMatch } from '@/lib/search/matchExplanation';

export interface RankingContext {
  queryQualityScore: number;
  queryConfidence: number;
  querySampleSize: number;
  ownedCards: Map<string, number>;
  hadFastClick: boolean;
  hadRefinement: boolean;
  isAuthenticated: boolean;
  /**
   * Parsed intent from the translation pipeline. When present, the ranker
   * boosts cards that match more of the user's inferred signals (colors,
   * types, mana value, oracle patterns, tags), so the strongest matches
   * surface first under the default "Best match" sort.
   */
  intent?: SearchIntent | null;
}

function popularityScore(card: ScryfallCard): number {
  if (!card.edhrec_rank) return 0.25;
  return Math.max(0, 1 - Math.min(card.edhrec_rank, 50000) / 50000);
}

function ownershipScore(card: ScryfallCard, ownedCards: Map<string, number>): number {
  return ownedCards.has(card.name) ? 1 : 0;
}

/** Max signals we count toward match-strength before capping. */
const MATCH_SATURATION = 5;

/** Normalized match-strength score in [0, 1] from parsed intent. */
function matchStrengthScore(card: ScryfallCard, intent: SearchIntent | null | undefined): number {
  if (!intent) return 0;
  const reasons = explainCardMatch(card, intent);
  if (reasons.length === 0) return 0;
  return Math.min(reasons.length, MATCH_SATURATION) / MATCH_SATURATION;
}

export function rerankCardsWithIntelligence(
  cards: ScryfallCard[],
  context: RankingContext,
): ScryfallCard[] {
  const coldStart = context.querySampleSize < 20 || context.queryConfidence < 0.3;
  const qualityInfluence = coldStart
    ? 0
    : Math.min(context.queryQualityScore * context.queryConfidence, 0.2);
  const fastClickWeight = context.hadFastClick ? 0.08 : 0;
  const refinementWeight = context.hadRefinement ? 0.06 : 0;
  const ownershipWeight = context.isAuthenticated ? 0.2 : 0.05;
  // Match strength dominates when we have a parsed intent: strongest weight
  // in the formula so the most relevant cards clearly bubble to the top.
  const matchWeight = context.intent ? 0.6 : 0;

  const scored = cards.map((card) => {
    const pop = popularityScore(card);
    const match = matchStrengthScore(card, context.intent);
    const own = ownershipScore(card, context.ownedCards);
    const score =
      matchWeight * match +
      0.45 * pop +
      ownershipWeight * own +
      qualityInfluence * pop +
      fastClickWeight +
      refinementWeight;
    return { card, score };
  });

  return scored.sort((a, b) => b.score - a.score).map((entry) => entry.card);
}
