import type { ScryfallCard } from '@/types/card';

export interface RankingContext {
  queryQualityScore: number;
  queryConfidence: number;
  querySampleSize: number;
  ownedCards: Map<string, number>;
  hadFastClick: boolean;
  hadRefinement: boolean;
  isAuthenticated: boolean;
}

function popularityScore(card: ScryfallCard): number {
  if (!card.edhrec_rank) return 0.25;
  return Math.max(0, 1 - Math.min(card.edhrec_rank, 50000) / 50000);
}

function ownershipScore(card: ScryfallCard, ownedCards: Map<string, number>): number {
  return ownedCards.has(card.name) ? 1 : 0;
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

  return [...cards].sort((a, b) => {
    const scoreA =
      0.45 * popularityScore(a) +
      ownershipWeight * ownershipScore(a, context.ownedCards) +
      qualityInfluence * popularityScore(a) +
      fastClickWeight +
      refinementWeight;

    const scoreB =
      0.45 * popularityScore(b) +
      ownershipWeight * ownershipScore(b, context.ownedCards) +
      qualityInfluence * popularityScore(b) +
      fastClickWeight +
      refinementWeight;

    return scoreB - scoreA;
  });
}
