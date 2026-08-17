import { describe, expect, it } from 'vitest';
import type { ScryfallCard } from '@/types/card';
import type {
  CandidateProvenance,
  QueryPlan,
  RecommendationIntent,
} from '@/types/recommendations';
import {
  evaluateRecommendationCases,
  evaluateOfflineRolloutGate,
  type RecommendationEvalCase,
  type RecommendationEvalResult,
} from './evaluation';

function card(
  name: string,
  overrides: Partial<ScryfallCard> = {},
): ScryfallCard {
  return {
    id: name,
    oracle_id: name,
    name,
    cmc: 2,
    type_line: 'Creature',
    oracle_text: '',
    color_identity: [],
    prices: { usd: '1' },
    legalities: { commander: 'legal' },
    rarity: 'rare',
    set: 'tst',
    set_name: 'Test',
    scryfall_uri: '',
    ...overrides,
  };
}

const plans: QueryPlan[] = [
  {
    id: 'functional',
    strategy: 'functional-expansion',
    query: 'otag:test',
    signal: 'test',
    confidence: 0.9,
    weight: 0.85,
  },
  {
    id: 'structural',
    strategy: 'structural',
    query: 't:creature',
    signal: 'creature',
    confidence: 0.5,
    weight: 0.4,
  },
];

function provenance(plan: QueryPlan, rank: number): CandidateProvenance {
  return {
    planId: plan.id,
    strategy: plan.strategy,
    sourceRank: rank,
    planWeight: plan.weight,
    signal: plan.signal,
  };
}

function intent(mode: 'similarity' | 'budget'): RecommendationIntent {
  return {
    version: 'v2',
    mode,
    sourceCardName: 'Source',
    hardConstraints: mode === 'budget' ? { maxPrice: 5 } : {},
    functionalSignals: [{ signal: 'test', confidence: 0.9 }],
    structuralSignals: { types: ['creature'], manaValue: 2, colorIdentity: [] },
    exclusions: ['Source'],
    confidence: 0.9,
  };
}

/** Frozen anchors: intentionally small and independent of generated cases. */
const frozenAnchors: RecommendationEvalCase[] = [
  {
    name: 'functional evidence beats popularity',
    source: card('Source', { oracle_text: 'Create a Treasure token.' }),
    plans,
    intent: intent('similarity'),
    relevantCardNames: ['Functional Match'],
    candidates: [
      {
        card: card('Popular Miss', { edhrec_rank: 1 }),
        provenance: [provenance(plans[1], 1)],
      },
      {
        card: card('Functional Match', {
          oracle_text: 'Create a Treasure token.',
          edhrec_rank: 10000,
        }),
        provenance: [provenance(plans[0], 2), provenance(plans[1], 4)],
      },
    ],
  },
  {
    name: 'explicit price ceiling',
    source: card('Source', { prices: { usd: '20' } }),
    plans,
    intent: intent('budget'),
    relevantCardNames: ['Legal Budget Match'],
    candidates: [
      {
        card: card('Over Budget', { prices: { usd: '5.01' } }),
        provenance: [provenance(plans[0], 1)],
      },
      {
        card: card('Legal Budget Match', { prices: { usd: '4' } }),
        provenance: [provenance(plans[0], 2)],
      },
    ],
  },
];

describe('recommendation evaluation', () => {
  it('passes frozen semantic and constraint anchors deterministically', () => {
    const result = evaluateRecommendationCases(frozenAnchors);

    expect(result.totalCases).toBe(2);
    expect(result.top1Accuracy).toBe(1);
    expect(result.mrr).toBe(1);
    expect(result.ndcgAt5).toBe(1);
    expect(result.recallAt20).toBe(1);
    expect(result.constraintViolations).toBe(0);
    expect(result.deterministicCases).toBe(2);
    expect(result.confidenceBrierScore).toBeGreaterThanOrEqual(0);
    expect(result.confidenceBrierScore).toBeLessThanOrEqual(1);
  });

  it('generates authoritative constraint and permutation cases from card data', () => {
    const generated = Array.from({ length: 24 }, (_, caseIndex) => {
      const candidates = Array.from({ length: 30 }, (_, cardIndex) => {
        const eligible = cardIndex < 15;
        const candidate = card(`Generated ${caseIndex}-${cardIndex}`, {
          prices: { usd: eligible ? `${1 + cardIndex / 10}` : '5.01' },
          legalities: { commander: eligible ? 'legal' : 'not_legal' },
          oracle_text: cardIndex === 14 ? 'Create a Treasure token.' : '',
        });
        return {
          card: candidate,
          provenance: [
            provenance(cardIndex === 14 ? plans[0] : plans[1], cardIndex + 1),
          ],
        };
      });
      return {
        name: `generated-constraints:${caseIndex}`,
        source: card(`Generated Source ${caseIndex}`, {
          oracle_text: 'Create a Treasure token.',
          prices: { usd: '20' },
        }),
        candidates,
        plans,
        intent: {
          ...intent('budget'),
          hardConstraints: { maxPrice: 5, format: 'commander' },
        },
        relevantCardNames: candidates
          .filter(
            ({ card: candidate }) =>
              candidate.legalities.commander === 'legal' &&
              Number(candidate.prices.usd) <= 5,
          )
          .map(({ card: candidate }) => candidate.name),
      } satisfies RecommendationEvalCase;
    });

    const result = evaluateRecommendationCases(generated);
    expect(result.totalCases).toBeGreaterThan(frozenAnchors.length);
    expect(result.constraintViolations).toBe(0);
    expect(result.recallAt20).toBe(1);
    expect(result.deterministicCases).toBe(generated.length);
  });

  it('blocks rollout on constraint, aggregate, or category regressions', () => {
    const baseline: RecommendationEvalResult = {
      totalCases: 10,
      top1Accuracy: 0.5,
      mrr: 0.6,
      ndcgAt5: 0.7,
      recallAt20: 0.8,
      constraintViolations: 0,
      deterministicCases: 10,
      confidenceBrierScore: 0.2,
      categoryNdcgAt5: { budget: 0.8 },
    };
    const challenger = {
      ...baseline,
      ndcgAt5: 0.73,
      constraintViolations: 1,
      categoryNdcgAt5: { budget: 0.74 },
    };

    const gate = evaluateOfflineRolloutGate(baseline, challenger);
    expect(gate.passes).toBe(false);
    expect(gate.reasons).toHaveLength(2);
  });
});
