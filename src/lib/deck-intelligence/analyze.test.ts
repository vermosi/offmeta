import { describe, it, expect } from 'vitest';
import { analyzeDeck, type ResolvedDeckCard } from './analyze';
import { coverageLevel } from './pillars';

const card = (
  name: string,
  tags: string[],
  overrides: Partial<ResolvedDeckCard> = {},
): ResolvedDeckCard => ({
  name,
  quantity: 1,
  oracleId: `oracle-${name}`,
  typeLine: 'Creature — Human',
  colors: ['G'],
  tags,
  ...overrides,
});

describe('coverageLevel', () => {
  it('classifies ratios into levels', () => {
    expect(coverageLevel(0)).toBe('very-low');
    expect(coverageLevel(0.4)).toBe('low');
    expect(coverageLevel(0.7)).toBe('moderate');
    expect(coverageLevel(1)).toBe('good');
    expect(coverageLevel(1.5)).toBe('high');
  });
});

describe('analyzeDeck', () => {
  it('counts lands separately from spells', () => {
    const profile = analyzeDeck([
      card('Forest', [], { typeLine: 'Basic Land — Forest', quantity: 10 }),
      card('Llanowar Elves', ['ramp']),
    ]);
    expect(profile.totalCards).toBe(11);
    expect(profile.landCount).toBe(10);
    expect(profile.spellCount).toBe(1);
  });

  it('treats creature-lands as spells for the land count', () => {
    const profile = analyzeDeck([
      card('Dryad Arbor', [], { typeLine: 'Land Creature — Forest Dryad' }),
    ]);
    expect(profile.landCount).toBe(0);
  });

  it('aggregates pillar coverage and reports gaps weakest-first', () => {
    const cards = [
      ...Array.from({ length: 10 }, (_, i) => card(`Ramp ${i}`, ['ramp'])),
      card('Draw One', ['draw']),
    ];
    const profile = analyzeDeck(cards);
    const ramp = profile.coverage.find((c) => c.pillar.key === 'ramp')!;
    expect(ramp.count).toBe(10);
    expect(ramp.level).toBe('high');
    expect(profile.gaps[0].ratio).toBeLessThanOrEqual(profile.gaps[1].ratio);
    expect(profile.gaps.some((g) => g.pillar.key === 'board-wipes')).toBe(true);
  });

  it('collects unresolved and untagged card names', () => {
    const profile = analyzeDeck([
      card('Fake Card', [], { oracleId: null }),
      card('Vanilla Bear', []),
      card('Cultivate', ['ramp']),
    ]);
    expect(profile.unresolved).toEqual(['Fake Card']);
    expect(profile.untagged).toEqual(['Vanilla Bear']);
  });

  it('derives colour identity in WUBRG order', () => {
    const profile = analyzeDeck([
      card('Red Thing', ['removal'], { colors: ['R'] }),
      card('Blue Thing', ['draw'], { colors: ['U'] }),
    ]);
    expect(profile.colorIdentity).toEqual(['U', 'R']);
  });
});
