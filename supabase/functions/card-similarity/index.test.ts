import { describe, expect, it } from 'vitest';
import {
  budgetCeiling,
  buildBudgetQuery,
  buildQueryPlans,
  buildSimilarQuery,
} from './query.ts';

describe('card-similarity query builders', () => {
  const card = {
    cardName: 'Dockside Extortionist',
    typeLine: 'Creature',
    oracleText: 'When this enters the battlefield, create treasure tokens.',
    colorIdentity: ['R'],
    cmc: 2,
    prices: { usd: '4.99' },
  };

  it('sorts budget queries by ascending price', () => {
    expect(buildBudgetQuery(card, ['repeatable-treasures'])).toContain(
      'order:usd dir:asc',
    );
  });

  it('sorts similar queries deterministically', () => {
    expect(buildSimilarQuery(card, ['repeatable-treasures'])).toContain(
      'order:name dir:asc',
    );
  });

  it('builds a bounded complementary plan with structural fallback', () => {
    const { plans, recoveryPlan } = buildQueryPlans(
      card,
      ['repeatable-treasures', 'ramp'],
      ['tokens', 'mana production'],
      0.9,
    );

    expect(plans).toHaveLength(4);
    expect(plans.at(-1)?.strategy).toBe('structural');
    expect(plans.every((plan) => !plan.query.includes('id<='))).toBe(true);
    expect(recoveryPlan.strategy).toBe('fallback');
  });

  it('uses a smooth automatic ceiling and no invented missing-price ceiling', () => {
    expect(budgetCeiling(card)).toBe(3.49);
    expect(budgetCeiling({ ...card, prices: {} })).toBe(0);
    expect(budgetCeiling({ ...card, explicitMaxPrice: 5 })).toBe(5);
  });
});
