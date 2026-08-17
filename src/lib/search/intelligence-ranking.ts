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

function ownershipScore(
  card: ScryfallCard,
  ownedCards: Map<string, number>,
): number {
  return ownedCards.has(card.name) ? 1 : 0;
}

function isDirectReason(reason: { label: string; token?: string }): boolean {
  const token = reason.token?.toLowerCase() ?? '';
  const label = reason.label.toLowerCase();
  return (
    token.startsWith('o:') ||
    token.startsWith('otag:') ||
    label.startsWith('oracle text:')
  );
}

/** Normalized match-strength score in [0, 1] from parsed intent. */
function matchStrengthScore(
  card: ScryfallCard,
  intent: SearchIntent | null | undefined,
): number {
  if (!intent) return 0;
  const reasons = explainCardMatch(card, intent);
  if (reasons.length === 0) return 0;
  let directReasons = 0;
  let structuralReasons = 0;

  for (const reason of reasons) {
    if (isDirectReason(reason)) {
      directReasons += 1;
    } else {
      structuralReasons += 1;
    }
  }

  if (directReasons > 0) {
    const directScore = 0.75 + directReasons * 0.1;
    const structuralBonus = structuralReasons * 0.03;
    return Math.min(1, directScore + structuralBonus);
  }

  return Math.min(0.15, structuralReasons * 0.05);
}

function intentMismatchPenalty(
  card: ScryfallCard,
  intent: SearchIntent | null | undefined,
): number {
  if (!intent) return 0;

  let penalty = 0;

  if (intent.colors && intent.colors.values.length > 0) {
    const cardColors = new Set(card.color_identity ?? card.colors ?? []);
    const matches = intent.colors.values.some((color) => cardColors.has(color));
    if (!matches) penalty += 0.18;
  }

  if (intent.types.length > 0) {
    const typeLine = (card.type_line ?? '').toLowerCase();
    const matches = intent.types.some((type) =>
      typeLine.includes(type.toLowerCase()),
    );
    if (!matches) penalty += 0.12;
  }

  if (intent.cmc && typeof card.cmc === 'number') {
    const { op, value } = intent.cmc;
    const meets =
      (op === '<' && card.cmc < value) ||
      (op === '<=' && card.cmc <= value) ||
      (op === '>' && card.cmc > value) ||
      (op === '>=' && card.cmc >= value) ||
      ((op === '=' || op === ':' || op === '==') && card.cmc === value);
    if (!meets) penalty += 0.1;
  }

  return Math.min(penalty, 0.35);
}

export function rerankCardsWithIntelligence(
  cards: ScryfallCard[],
  context: RankingContext,
): ScryfallCard[] {
  const coldStart =
    context.querySampleSize < 20 || context.queryConfidence < 0.3;
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
    const mismatchPenalty = intentMismatchPenalty(card, context.intent);
    const score =
      matchWeight * match +
      0.45 * pop +
      ownershipWeight * own +
      qualityInfluence * pop +
      fastClickWeight +
      refinementWeight -
      mismatchPenalty;
    return { card, score };
  });

  return scored.sort((a, b) => b.score - a.score).map((entry) => entry.card);
}
