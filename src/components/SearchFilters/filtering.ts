import type { ScryfallCard } from '@/types/card';
import type { FilterState } from '@/types/filters';
import { RARITY_ORDER } from '@/components/SearchFilters/constants';

export function applyCardFilters(
  cards: ScryfallCard[],
  filters: FilterState,
  collectionLookup?: Map<string, number>,
): ScryfallCard[] {
  let result = [...cards];

  if (filters.ownedOnly && collectionLookup) {
    result = result.filter((card) => collectionLookup.has(card.name));
  }

  // Format legality filter
  if (filters.format) {
    const fmt = filters.format;
    result = result.filter((card) => {
      const legality = card.legalities?.[fmt];
      return legality === 'legal' || legality === 'restricted';
    });
  }

  if (filters.colors.length > 0) {
    result = result.filter((card) => {
      const cardColors = card.colors || [];
      const isColorless = cardColors.length === 0;
      const wantsColorless = filters.colors.includes('C');
      const colorFilters = filters.colors.filter((c) => c !== 'C');

      if (colorFilters.length === 0 && wantsColorless) return isColorless;
      if (colorFilters.length > 0 && wantsColorless && isColorless)
        return false;

      return colorFilters.every((color) => cardColors.includes(color));
    });
  }

  if (filters.types.length > 0) {
    result = result.filter((card) => {
      const typeLine = card.type_line.toLowerCase();
      return filters.types.some((type) =>
        typeLine.includes(type.toLowerCase()),
      );
    });
  }

  result = result.filter((card) => {
    const cmc = card.cmc || 0;
    return cmc >= filters.cmcRange[0] && cmc <= filters.cmcRange[1];
  });

  return applyCardSort(result, filters.sortBy);
}

export function applyCardSort(
  cards: ScryfallCard[],
  sortBy: string,
): ScryfallCard[] {
  const [sortField, sortDir] = sortBy.split('-') as [string, 'asc' | 'desc'];

  return [...cards].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'cmc':
        comparison = (a.cmc || 0) - (b.cmc || 0);
        break;
      case 'price': {
        const priceA = a.prices?.usd ? parseFloat(a.prices.usd) : null;
        const priceB = b.prices?.usd ? parseFloat(b.prices.usd) : null;
        if (priceA == null && priceB == null) return 0;
        if (priceA == null) return 1;
        if (priceB == null) return -1;
        comparison = priceA - priceB;
        break;
      }
      case 'rarity': {
        const rarityA =
          RARITY_ORDER[a.rarity as keyof typeof RARITY_ORDER] || 0;
        const rarityB =
          RARITY_ORDER[b.rarity as keyof typeof RARITY_ORDER] || 0;
        comparison = rarityA - rarityB;
        break;
      }
      case 'edhrec': {
        const rankA = a.edhrec_rank ?? null;
        const rankB = b.edhrec_rank ?? null;
        if (rankA == null && rankB == null) return 0;
        if (rankA == null) return 1;
        if (rankB == null) return -1;
        comparison = rankA - rankB;
        break;
      }
      default:
        break;
    }

    return sortDir === 'desc' ? -comparison : comparison;
  });
}

export function countActiveFilters(
  filters: FilterState,
  defaultMaxCmc: number,
): number {
  return (
    filters.colors.length +
    filters.types.length +
    (filters.cmcRange[0] > 0 || filters.cmcRange[1] < defaultMaxCmc ? 1 : 0) +
    (filters.ownedOnly ? 1 : 0) +
    (filters.format ? 1 : 0)
  );
}

export function hasActiveFilters(
  filters: FilterState,
  defaultMaxCmc: number,
): boolean {
  return countActiveFilters(filters, defaultMaxCmc) > 0;
}
