/**
 * Regression tests for applyCardSort comparators.
 * Ensures missing data always sorts to the end regardless of direction.
 */
import { describe, it, expect } from 'vitest';
import { applyCardSort } from '@/components/SearchFilters/filtering';
import type { ScryfallCard } from '@/types/card';

function makeCard(overrides: Partial<ScryfallCard> = {}): ScryfallCard {
  return {
    id: 'card-1',
    name: 'Test Card',
    cmc: 3,
    type_line: 'Creature',
    colors: ['W'],
    color_identity: ['W'],
    set: 'test',
    set_name: 'Test Set',
    rarity: 'common',
    scryfall_uri: '',
    legalities: {},
    prices: { usd: '1.00' },
    ...overrides,
  } as unknown as ScryfallCard;
}

describe('applyCardSort', () => {
  describe('name sort', () => {
    const cards = [
      makeCard({ id: '1', name: 'Zebra' }),
      makeCard({ id: '2', name: 'Alpha' }),
      makeCard({ id: '3', name: 'Middle' }),
    ];

    it('sorts A-Z ascending', () => {
      const sorted = applyCardSort(cards, 'name-asc');
      expect(sorted.map((c) => c.name)).toEqual(['Alpha', 'Middle', 'Zebra']);
    });

    it('sorts Z-A descending', () => {
      const sorted = applyCardSort(cards, 'name-desc');
      expect(sorted.map((c) => c.name)).toEqual(['Zebra', 'Middle', 'Alpha']);
    });
  });

  describe('cmc sort', () => {
    const cards = [
      makeCard({ id: '1', name: 'Big', cmc: 7 }),
      makeCard({ id: '2', name: 'Small', cmc: 1 }),
      makeCard({ id: '3', name: 'Mid', cmc: 3 }),
    ];

    it('sorts low-to-high ascending', () => {
      const sorted = applyCardSort(cards, 'cmc-asc');
      expect(sorted.map((c) => c.cmc)).toEqual([1, 3, 7]);
    });

    it('sorts high-to-low descending', () => {
      const sorted = applyCardSort(cards, 'cmc-desc');
      expect(sorted.map((c) => c.cmc)).toEqual([7, 3, 1]);
    });
  });

  describe('price sort — missing prices always last', () => {
    const cards = [
      makeCard({ id: '1', name: 'Cheap', prices: { usd: '0.50' } }),
      makeCard({ id: '2', name: 'NoPriceA', prices: {} }),
      makeCard({ id: '3', name: 'Expensive', prices: { usd: '10.00' } }),
      makeCard({ id: '4', name: 'NoPriceB', prices: { usd: null } } as any),
    ];

    it('ascending: priced cards first, missing last', () => {
      const sorted = applyCardSort(cards, 'price-asc');
      const names = sorted.map((c) => c.name);
      expect(names.slice(0, 2)).toEqual(['Cheap', 'Expensive']);
      expect(names.slice(2)).toEqual(
        expect.arrayContaining(['NoPriceA', 'NoPriceB']),
      );
    });

    it('descending: priced cards first (high→low), missing last', () => {
      const sorted = applyCardSort(cards, 'price-desc');
      const names = sorted.map((c) => c.name);
      expect(names.slice(0, 2)).toEqual(['Expensive', 'Cheap']);
      expect(names.slice(2)).toEqual(
        expect.arrayContaining(['NoPriceA', 'NoPriceB']),
      );
    });
  });

  describe('edhrec sort — missing ranks always last', () => {
    const cards = [
      makeCard({ id: '1', name: 'Popular', edhrec_rank: 100 } as any),
      makeCard({ id: '2', name: 'NoRank' }),
      makeCard({ id: '3', name: 'Obscure', edhrec_rank: 50000 } as any),
    ];

    it('ascending: ranked cards first, missing last', () => {
      const sorted = applyCardSort(cards, 'edhrec-asc');
      expect(sorted.map((c) => c.name)).toEqual([
        'Popular',
        'Obscure',
        'NoRank',
      ]);
    });

    it('descending: ranked cards first (high→low), missing last', () => {
      const sorted = applyCardSort(cards, 'edhrec-desc');
      expect(sorted.map((c) => c.name)).toEqual([
        'Obscure',
        'Popular',
        'NoRank',
      ]);
    });
  });

  describe('rarity sort', () => {
    const cards = [
      makeCard({ id: '1', name: 'C', rarity: 'common' }),
      makeCard({ id: '2', name: 'M', rarity: 'mythic' }),
      makeCard({ id: '3', name: 'R', rarity: 'rare' }),
      makeCard({ id: '4', name: 'U', rarity: 'uncommon' }),
    ];

    it('ascending: common → mythic', () => {
      const sorted = applyCardSort(cards, 'rarity-asc');
      expect(sorted.map((c) => c.rarity)).toEqual([
        'common',
        'uncommon',
        'rare',
        'mythic',
      ]);
    });

    it('descending: mythic → common', () => {
      const sorted = applyCardSort(cards, 'rarity-desc');
      expect(sorted.map((c) => c.rarity)).toEqual([
        'mythic',
        'rare',
        'uncommon',
        'common',
      ]);
    });
  });
});
