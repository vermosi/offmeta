import { describe, expect, it } from 'vitest';
import type { ScryfallCard } from '@/types/card';
import type {
  CandidateProvenance,
  QueryPlan,
  RecommendationIntent,
} from '@/types/recommendations';
import { automaticBudgetCeiling, rankSimilarityCandidates } from './ranking';

function card(
  name: string,
  overrides: Partial<ScryfallCard> = {},
): ScryfallCard {
  return {
    id: name,
    oracle_id: name,
    name,
    cmc: 3,
    type_line: 'Creature',
    oracle_text: '',
    color_identity: [],
    colors: [],
    prices: {},
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
    query: 'otag:repeatable-treasures',
    signal: 'repeatable-treasures',
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

const intent: RecommendationIntent = {
  version: 'v2',
  mode: 'similarity',
  sourceCardName: 'Dockside Extortionist',
  hardConstraints: {},
  functionalSignals: [{ signal: 'repeatable-treasures', confidence: 0.9 }],
  structuralSignals: {
    types: ['creature'],
    manaValue: 2,
    colorIdentity: ['R'],
  },
  exclusions: ['Dockside Extortionist'],
  confidence: 0.9,
};

function provenance(plan: QueryPlan, sourceRank: number): CandidateProvenance {
  return {
    planId: plan.id,
    strategy: plan.strategy,
    sourceRank,
    planWeight: plan.weight,
    signal: plan.signal,
  };
}

describe('recommendation V2 ranking', () => {
  it('prefers independently proven functional matches over a popular staple', () => {
    const source = card('Dockside Extortionist', {
      cmc: 2,
      type_line: 'Creature — Goblin Pirate',
      oracle_text: 'Create a Treasure token for each artifact and enchantment.',
      color_identity: ['R'],
      prices: { usd: '80' },
    });
    const treasureCard = card('Treasure Maker', {
      oracle_text: 'Whenever this attacks, create a Treasure token.',
      color_identity: ['G'],
      edhrec_rank: 5000,
      prices: { usd: '3' },
    });
    const staple = card('Popular Body', {
      oracle_text: 'Vigilance',
      color_identity: ['R'],
      edhrec_rank: 1,
      prices: { usd: '1' },
    });

    const ranked = rankSimilarityCandidates(
      source,
      [
        { card: staple, provenance: [provenance(plans[1], 1)] },
        {
          card: treasureCard,
          provenance: [provenance(plans[0], 3), provenance(plans[1], 5)],
        },
      ],
      plans,
      intent,
    );

    expect(ranked.similar[0].card.name).toBe('Treasure Maker');
    expect(ranked.similar[0].breakdown.confidence).toBeGreaterThan(0.5);
  });

  it('enforces explicit ceilings and ranks budget cards by fit plus price', () => {
    const source = card('Source', { prices: { usd: '10' } });
    const budgetIntent = {
      ...intent,
      mode: 'budget' as const,
      hardConstraints: { maxPrice: 5 },
      exclusions: ['Source'],
    };
    const under = card('Under', { prices: { usd: '4' } });
    const over = card('Over', { prices: { usd: '5.01' } });
    const ranked = rankSimilarityCandidates(
      source,
      [
        { card: under, provenance: [provenance(plans[0], 1)] },
        { card: over, provenance: [provenance(plans[0], 2)] },
      ],
      plans,
      budgetIntent,
    );

    expect(ranked.budget.map((entry) => entry.card.name)).toEqual(['Under']);
  });

  it('does not invent an automatic ceiling for missing or sub-$2 prices', () => {
    expect(automaticBudgetCeiling(card('Missing'))).toBeNull();
    expect(
      automaticBudgetCeiling(card('Cheap', { prices: { usd: '1.99' } })),
    ).toBeNull();
  });
});
