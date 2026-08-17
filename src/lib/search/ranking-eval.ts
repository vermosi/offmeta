import type { ScryfallCard } from '@/types/card';
import type { SearchIntent } from '@/types/search';

export interface RankingEvalCase {
  name: string;
  cards: ScryfallCard[];
  intent: SearchIntent | null;
  /**
   * Names of cards considered relevant for this fixture, ordered from most to
   * least relevant when multiple cards qualify.
   */
  relevant: string[];
}

export interface RankingEvalResult {
  totalCases: number;
  top1Accuracy: number;
  mrr: number;
  ndcgAt5: number;
}

export interface RankingCandidate {
  name: string;
  score: number;
}

function relevanceGain(rank: number): number {
  return 1 / Math.log2(rank + 1);
}

function relevanceFor(cardName: string, relevant: string[]): number {
  const index = relevant.findIndex(
    (name) => name.toLowerCase() === cardName.toLowerCase(),
  );
  return index < 0 ? 0 : relevant.length - index;
}

function reciprocalRank(
  sortedCards: ScryfallCard[],
  relevant: string[],
): number {
  const first = sortedCards.findIndex(
    (card) => relevanceFor(card.name, relevant) > 0,
  );
  return first < 0 ? 0 : 1 / (first + 1);
}

function ndcgAtK(
  sortedCards: ScryfallCard[],
  relevant: string[],
  k: number,
): number {
  const limited = sortedCards.slice(0, k);
  const dcg = limited.reduce((sum, card, index) => {
    const rel = relevanceFor(card.name, relevant);
    return sum + (rel > 0 ? (2 ** rel - 1) * relevanceGain(index + 1) : 0);
  }, 0);

  const ideal = [...relevant].slice(0, k).reduce((sum, cardName, index) => {
    const rel = relevanceFor(cardName, relevant);
    return sum + (2 ** rel - 1) * relevanceGain(index + 1);
  }, 0);

  return ideal === 0 ? 0 : dcg / ideal;
}

export function evaluateRanking(
  cases: RankingEvalCase[],
  ranker: (
    cards: ScryfallCard[],
    intent: SearchIntent | null,
  ) => ScryfallCard[],
): RankingEvalResult {
  if (cases.length === 0) {
    return { totalCases: 0, top1Accuracy: 0, mrr: 0, ndcgAt5: 0 };
  }

  let top1Hits = 0;
  let reciprocalSum = 0;
  let ndcgSum = 0;

  for (const testCase of cases) {
    const ranked = ranker(testCase.cards, testCase.intent);
    const topCard = ranked[0];
    if (topCard && relevanceFor(topCard.name, testCase.relevant) > 0) {
      top1Hits += 1;
    }
    reciprocalSum += reciprocalRank(ranked, testCase.relevant);
    ndcgSum += ndcgAtK(ranked, testCase.relevant, 5);
  }

  return {
    totalCases: cases.length,
    top1Accuracy: top1Hits / cases.length,
    mrr: reciprocalSum / cases.length,
    ndcgAt5: ndcgSum / cases.length,
  };
}

export function scoreCandidates(
  cards: ScryfallCard[],
  scoreCard: (card: ScryfallCard) => number,
): ScryfallCard[] {
  return cards
    .map((card) => ({ card, score: scoreCard(card) }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.card);
}
