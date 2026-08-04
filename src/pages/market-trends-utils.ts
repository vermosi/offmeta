import type { PriceMover } from '@/hooks';

export type SortField = 'change' | 'current' | 'name' | 'previous';
export type SortDir = 'asc' | 'desc';

export interface MarketFilters {
  direction: string;
  format: string;
  rarity: string;
  cardType: string;
  priceRange: number;
  minChange: number;
}

export const DEFAULT_FILTERS: MarketFilters = {
  direction: 'all',
  format: '',
  rarity: '',
  cardType: '',
  priceRange: 0,
  minChange: 0,
};

export const PRICE_RANGES = [
  { min: 0, max: Infinity, label: 'Any Price' },
  { min: 0, max: 1, label: 'Under $1' },
  { min: 1, max: 5, label: '$1 - $5' },
  { min: 5, max: 20, label: '$5 - $20' },
  { min: 20, max: 50, label: '$20 - $50' },
  { min: 50, max: Infinity, label: '$50+' },
] as const;

export function countActiveFilters(filters: MarketFilters): number {
  let count = 0;
  if (filters.direction !== 'all') count++;
  if (filters.format) count++;
  if (filters.rarity) count++;
  if (filters.cardType) count++;
  if (filters.priceRange > 0) count++;
  if (filters.minChange > 0) count++;
  return count;
}

export function applyFilters(
  movers: PriceMover[],
  filters: MarketFilters,
): PriceMover[] {
  return movers.filter((m) => {
    if (filters.direction !== 'all' && m.direction !== filters.direction) {
      return false;
    }
    if (filters.format && m.legalities) {
      const legality = (m.legalities as Record<string, string>)[filters.format];
      if (legality !== 'legal' && legality !== 'restricted') return false;
    } else if (filters.format && !m.legalities) {
      return false;
    }
    if (filters.rarity && m.rarity !== filters.rarity) return false;
    if (filters.cardType && m.type_line) {
      if (!m.type_line.includes(filters.cardType)) return false;
    } else if (filters.cardType && !m.type_line) {
      return false;
    }
    const range = PRICE_RANGES[filters.priceRange];
    if (range && (m.current_price < range.min || m.current_price > range.max)) {
      return false;
    }
    if (filters.minChange > 0 && Math.abs(m.change_percent) < filters.minChange) {
      return false;
    }
    return true;
  });
}

export function sortMovers(
  movers: PriceMover[],
  field: SortField,
  dir: SortDir,
): PriceMover[] {
  const sorted = [...movers];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case 'change':
        // Signed percentage change: biggest gainers first when descending.
        cmp = b.change_percent - a.change_percent;
        break;
      case 'current':
        cmp = b.current_price - a.current_price;
        break;
      case 'previous':
        cmp = b.previous_price - a.previous_price;
        break;
      case 'name':
        cmp = a.card_name.localeCompare(b.card_name);
        break;
    }
    return dir === 'asc' ? -cmp : cmp;
  });
  return sorted;
}
