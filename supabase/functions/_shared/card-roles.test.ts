import { describe, expect, it } from 'vitest';

import {
  computeRoleIdfWeights,
  computeRoleSimilarity,
  findSimilarRolePairs,
  type CardRoleProfile,
} from './card-roles';

function profile(
  oracleId: string,
  roles: string[],
  overrides: Partial<CardRoleProfile> = {},
): CardRoleProfile {
  return {
    oracle_id: oracleId,
    name: oracleId,
    roles,
    typeCategory: 'instant',
    cmc: 2,
    colors: ['U'],
    ...overrides,
  };
}

describe('computeRoleSimilarity', () => {
  it('weights rare shared roles more heavily than common shared roles', () => {
    const cards = [
      profile('anchor', ['common', 'rare']),
      profile('common-match', ['common', 'other']),
      profile('rare-match', ['rare', 'other']),
      ...Array.from({ length: 8 }, (_, index) =>
        profile(`common-${index}`, ['common']),
      ),
    ];
    const weights = computeRoleIdfWeights(cards);

    expect(computeRoleSimilarity(cards[0], cards[2], weights)).toBeGreaterThan(
      computeRoleSimilarity(cards[0], cards[1], weights),
    );
  });

  it('uses a smooth exponential mana-distance score', () => {
    const anchor = profile('anchor', ['draw']);
    const gapOne = profile('gap-1', ['draw'], { cmc: 3 });
    const gapTwo = profile('gap-2', ['draw'], { cmc: 4 });
    const scoreOne = computeRoleSimilarity(anchor, gapOne);
    const scoreTwo = computeRoleSimilarity(anchor, gapTwo);

    expect(scoreOne).toBeGreaterThan(scoreTwo);
    expect(scoreOne - scoreTwo).toBeGreaterThan(
      computeRoleSimilarity(anchor, gapTwo) -
        computeRoleSimilarity(anchor, profile('gap-3', ['draw'], { cmc: 5 })),
    );
  });

  it('does not award a type bonus when both types are unknown', () => {
    const known = computeRoleSimilarity(
      profile('a', ['draw']),
      profile('b', ['draw']),
    );
    const unknown = computeRoleSimilarity(
      profile('a', ['draw'], { typeCategory: 'unknown' }),
      profile('b', ['draw'], { typeCategory: 'unknown' }),
    );

    expect(known - unknown).toBeCloseTo(0.2);
  });
});

describe('findSimilarRolePairs', () => {
  it('deterministically generates candidates for groups larger than 200', () => {
    const cards = Array.from({ length: 201 }, (_, index) =>
      profile(`card-${index.toString().padStart(3, '0')}`, ['draw']),
    );

    const forward = findSimilarRolePairs(cards, 0, 2);
    const reversed = findSimilarRolePairs([...cards].reverse(), 0, 2);

    expect(forward.length).toBeGreaterThan(0);
    expect(reversed).toEqual(forward);
    expect(
      forward.some(
        ({ cardA, cardB }) => cardA === 'card-200' || cardB === 'card-200',
      ),
    ).toBe(true);
  });

  it('treats two colorless profiles as a full color match', () => {
    const colorless = computeRoleSimilarity(
      profile('a', ['draw'], { colors: [] }),
      profile('b', ['draw'], { colors: [] }),
    );
    const mismatched = computeRoleSimilarity(
      profile('a', ['draw'], { colors: [] }),
      profile('b', ['draw'], { colors: ['U'] }),
    );

    expect(colorless - mismatched).toBeCloseTo(0.1);
  });

  it('enforces the degree cap at both endpoints', () => {
    const pairs = findSimilarRolePairs(
      Array.from({ length: 8 }, (_, index) =>
        profile(`card-${index}`, ['draw']),
      ),
      0,
      2,
    );
    const degrees = new Map<string, number>();
    for (const { cardA, cardB } of pairs) {
      degrees.set(cardA, (degrees.get(cardA) ?? 0) + 1);
      degrees.set(cardB, (degrees.get(cardB) ?? 0) + 1);
    }

    expect(Math.max(...degrees.values())).toBeLessThanOrEqual(2);
  });

  it('breaks equal-weight ties by canonical card IDs', () => {
    const cards = ['d', 'b', 'c', 'a'].map((id) => profile(id, ['draw']));

    expect(findSimilarRolePairs(cards, 0, 1)).toEqual([
      expect.objectContaining({ cardA: 'a', cardB: 'b' }),
      expect.objectContaining({ cardA: 'c', cardB: 'd' }),
    ]);
  });
});
