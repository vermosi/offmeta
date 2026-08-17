import { describe, expect, it } from 'vitest';
import { buildBudgetQuery, buildSimilarQuery } from './index.ts';

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
});
