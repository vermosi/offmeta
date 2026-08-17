import type { ScryfallCard } from '@/types/card';
import type { QueryPlan, RecommendationIntent } from '@/types/recommendations';
import {
  rankSimilarityCandidates,
  type CandidateWithProvenance,
  type RankedRecommendation,
} from '@/lib/recommendations/ranking';

export interface RecommendationEvalCase {
  name: string;
  source: ScryfallCard;
  candidates: CandidateWithProvenance[];
  plans: QueryPlan[];
  intent: RecommendationIntent;
  relevantCardNames: string[];
}

export interface RecommendationEvalResult {
  totalCases: number;
  top1Accuracy: number;
  mrr: number;
  ndcgAt5: number;
  recallAt20: number;
  constraintViolations: number;
  deterministicCases: number;
  confidenceBrierScore: number;
  categoryNdcgAt5: Record<string, number>;
}

export interface RecommendationRolloutGate {
  passes: boolean;
  reasons: string[];
}

function relevance(name: string, relevant: string[]): number {
  const index = relevant.findIndex(
    (value) => value.toLowerCase() === name.toLowerCase(),
  );
  return index < 0 ? 0 : relevant.length - index;
}

function reciprocalRank(
  ranked: RankedRecommendation[],
  relevant: string[],
): number {
  const index = ranked.findIndex(
    (entry) => relevance(entry.card.name, relevant) > 0,
  );
  return index < 0 ? 0 : 1 / (index + 1);
}

function ndcgAt5(ranked: RankedRecommendation[], relevant: string[]): number {
  const dcg = ranked.slice(0, 5).reduce((sum, entry, index) => {
    const rel = relevance(entry.card.name, relevant);
    return sum + (rel > 0 ? (2 ** rel - 1) / Math.log2(index + 2) : 0);
  }, 0);
  const ideal = relevant.slice(0, 5).reduce((sum, _name, index) => {
    const rel = relevant.length - index;
    return sum + (2 ** rel - 1) / Math.log2(index + 2);
  }, 0);
  return ideal === 0 ? 0 : dcg / ideal;
}

function violatesConstraints(
  card: ScryfallCard,
  intent: RecommendationIntent,
): boolean {
  const constraints = intent.hardConstraints;
  if (constraints.maxPrice !== undefined) {
    const price = Number(card.prices.usd);
    if (!Number.isFinite(price) || price > constraints.maxPrice) return true;
  }
  if (
    constraints.format &&
    card.legalities[constraints.format.toLowerCase()] !== 'legal'
  ) {
    return true;
  }
  if (
    constraints.maxManaValue !== undefined &&
    card.cmc > constraints.maxManaValue
  ) {
    return true;
  }
  if (
    constraints.minManaValue !== undefined &&
    card.cmc < constraints.minManaValue
  ) {
    return true;
  }
  if (constraints.colors?.length) {
    const actual = new Set(card.color_identity ?? []);
    const wanted = new Set(constraints.colors);
    if (![...actual].every((color) => wanted.has(color))) return true;
    if (constraints.exactColorIdentity && actual.size !== wanted.size)
      return true;
  }
  if (
    constraints.types?.length &&
    !constraints.types.every((type) =>
      card.type_line.toLowerCase().includes(type.toLowerCase()),
    )
  ) {
    return true;
  }
  if (
    intent.exclusions.some(
      (name) => name.toLowerCase() === card.name.toLowerCase(),
    )
  ) {
    return true;
  }
  return false;
}

function names(ranked: RankedRecommendation[]): string[] {
  return ranked.map((entry) => entry.card.name);
}

export function evaluateRecommendationCases(
  cases: RecommendationEvalCase[],
): RecommendationEvalResult {
  if (cases.length === 0) {
    return {
      totalCases: 0,
      top1Accuracy: 0,
      mrr: 0,
      ndcgAt5: 0,
      recallAt20: 0,
      constraintViolations: 0,
      deterministicCases: 0,
      confidenceBrierScore: 0,
      categoryNdcgAt5: {},
    };
  }

  let top1 = 0;
  let reciprocal = 0;
  let ndcg = 0;
  let recall = 0;
  let violations = 0;
  let deterministic = 0;
  let brier = 0;
  const categories = new Map<string, { total: number; ndcg: number }>();

  for (const testCase of cases) {
    const first = rankSimilarityCandidates(
      testCase.source,
      testCase.candidates,
      testCase.plans,
      testCase.intent,
    );
    const ranked =
      testCase.intent.mode === 'budget' ? first.budget : first.similar;
    if (
      ranked[0] &&
      relevance(ranked[0].card.name, testCase.relevantCardNames) > 0
    ) {
      top1 += 1;
    }
    reciprocal += reciprocalRank(ranked, testCase.relevantCardNames);
    const caseNdcg = ndcgAt5(ranked, testCase.relevantCardNames);
    ndcg += caseNdcg;
    const category = testCase.name.split(':', 1)[0];
    const categoryMetrics = categories.get(category) ?? { total: 0, ndcg: 0 };
    categoryMetrics.total += 1;
    categoryMetrics.ndcg += caseNdcg;
    categories.set(category, categoryMetrics);
    const topRelevant = ranked[0]
      ? relevance(ranked[0].card.name, testCase.relevantCardNames) > 0
      : false;
    brier +=
      ((ranked[0]?.breakdown.confidence ?? 0) - Number(topRelevant)) ** 2;
    const found = new Set(
      ranked.slice(0, 20).map((entry) => entry.card.name.toLowerCase()),
    );
    recall +=
      testCase.relevantCardNames.filter((name) => found.has(name.toLowerCase()))
        .length / Math.max(testCase.relevantCardNames.length, 1);
    violations += ranked.filter((entry) =>
      violatesConstraints(entry.card, testCase.intent),
    ).length;

    const permuted = rankSimilarityCandidates(
      testCase.source,
      [...testCase.candidates].reverse(),
      [...testCase.plans].reverse(),
      testCase.intent,
    );
    const permutedRanked =
      testCase.intent.mode === 'budget' ? permuted.budget : permuted.similar;
    if (
      JSON.stringify(names(ranked)) === JSON.stringify(names(permutedRanked))
    ) {
      deterministic += 1;
    }
  }

  return {
    totalCases: cases.length,
    top1Accuracy: top1 / cases.length,
    mrr: reciprocal / cases.length,
    ndcgAt5: ndcg / cases.length,
    recallAt20: recall / cases.length,
    constraintViolations: violations,
    deterministicCases: deterministic,
    confidenceBrierScore: brier / cases.length,
    categoryNdcgAt5: Object.fromEntries(
      [...categories].map(([category, value]) => [
        category,
        value.ndcg / value.total,
      ]),
    ),
  };
}

export function evaluateOfflineRolloutGate(
  baseline: RecommendationEvalResult,
  challenger: RecommendationEvalResult,
): RecommendationRolloutGate {
  const reasons: string[] = [];
  if (challenger.constraintViolations > 0) {
    reasons.push('explicit constraint violations must remain zero');
  }
  if (challenger.ndcgAt5 < baseline.ndcgAt5 + 0.02) {
    reasons.push('overall nDCG@5 must improve by at least 0.02');
  }
  for (const [category, baselineScore] of Object.entries(
    baseline.categoryNdcgAt5,
  )) {
    const challengerScore = challenger.categoryNdcgAt5[category] ?? 0;
    if (challengerScore < baselineScore - 0.05) {
      reasons.push(`${category} nDCG@5 regressed by more than 0.05`);
    }
  }
  return { passes: reasons.length === 0, reasons };
}
