import { describe, expect, it } from 'vitest';
import {
  applyFilters,
  countActiveFilters,
  sortMovers,
} from '../market-trends-utils';
import type { PriceMover } from '@/hooks';

const movers: PriceMover[] = [
  {
    card_name: 'Card A',
    direction: 'up',
    current_price: 10,
    previous_price: 8,
    change_percent: 25,
    rarity: 'rare',
    type_line: 'Creature — Dragon',
    legalities: { commander: 'legal' },
  } as unknown as PriceMover,
  {
    card_name: 'Card B',
    direction: 'down',
    current_price: 2,
    previous_price: 4,
    change_percent: -50,
    rarity: 'common',
    type_line: 'Sorcery',
    legalities: { commander: 'legal' },
  } as unknown as PriceMover,
];

describe('MarketTrends helpers', () => {
  it('counts active filters accurately', () => {
    expect(
      countActiveFilters({
        direction: 'up',
        format: 'modern',
        rarity: 'rare',
        cardType: 'Creature',
        priceRange: 2,
        minChange: 10,
      }),
    ).toBe(6);
  });

  it('filters movers by direction and card type', () => {
    const filtered = applyFilters(movers, {
      direction: 'up',
      format: '',
      rarity: '',
      cardType: 'Creature',
      priceRange: 0,
      minChange: 0,
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].card_name).toBe('Card A');
  });

  it('sorts movers by signed percent change', () => {
    const sorted = sortMovers(movers, 'change', 'desc');
    expect(sorted[0].card_name).toBe('Card A');
    expect(sorted[1].card_name).toBe('Card B');
  });
});
