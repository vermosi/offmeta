/**
 * Server-side query filter utilities.
 * Converts FilterState into Scryfall query syntax to reduce data transfer.
 * @module lib/search/filters
 */

import type { FilterState } from '@/types/filters';

/**
 * Sort field mappings from UI sort values to Scryfall order parameters.
 * Note: Scryfall uses 'order:' for sort field and 'dir:' for direction.
 */
const SORT_FIELD_MAP: Record<string, string> = {
  name: 'name',
  cmc: 'cmc',
  price: 'usd',
  rarity: 'rarity',
  edhrec: 'edhrec',
};

/**
 * Builds Scryfall query parameters from client-side filters.
 * Designed to be appended to the base translated query.
 *
 * @param filters - The filter state from SearchFilters component
 * @returns Scryfall query string fragment
 *
 * @example
 * buildServerSideFilterQuery({ colors: ['R', 'G'], types: ['Creature'], cmcRange: [2, 5], sortBy: 'cmc-asc' })
 * // Returns: "(c:r or c:g) (t:creature) mv>=2 mv<=5 order:cmc dir:asc"
 */
export function buildServerSideFilterQuery(
  filters?: FilterState | null,
): string {
  if (!filters) return '';

  const parts: string[] = [];

  // Color filter - OR logic (any of the selected colors)
  if (filters.colors.length > 0) {
    const colorParts = filters.colors.map((color) =>
      color === 'C' ? 'c=c' : `c:${color.toLowerCase()}`,
    );
    if (colorParts.length === 1) {
      parts.push(colorParts[0]);
    } else {
      parts.push(`(${colorParts.join(' or ')})`);
    }
  }

  // Type filter - OR logic (any of the selected types)
  if (filters.types.length > 0) {
    const typeParts = filters.types.map((type) => `t:${type.toLowerCase()}`);
    if (typeParts.length === 1) {
      parts.push(typeParts[0]);
    } else {
      parts.push(`(${typeParts.join(' or ')})`);
    }
  }

  // CMC range filter
  const [minCmc, maxCmc] = filters.cmcRange;
  if (minCmc > 0) {
    parts.push(`mv>=${minCmc}`);
  }
  // Only add max if it's a reasonable limit (not the default high value)
  if (maxCmc < 16) {
    parts.push(`mv<=${maxCmc}`);
  }

  // Sorting - append order and direction
  if (filters.sortBy && filters.sortBy !== 'name-asc') {
    const [sortField, sortDir] = filters.sortBy.split('-') as [
      string,
      'asc' | 'desc',
    ];
    const scryfallField = SORT_FIELD_MAP[sortField];
    if (scryfallField) {
      parts.push(`order:${scryfallField}`);
      parts.push(`dir:${sortDir}`);
    }
  }

  return parts.join(' ').trim();
}

/**
 * Merges base query with filter query, avoiding duplicates.
 *
 * @param baseQuery - The original Scryfall query
 * @param filterQuery - The filter query fragment
 * @returns Combined query string
 */
export function mergeQueryWithFilters(
  baseQuery: string,
  filterQuery: string,
): string {
  if (!filterQuery) return baseQuery;
  if (!baseQuery) return filterQuery;

  // Avoid duplicate constraints
  const baseLower = baseQuery.toLowerCase();
  const filterParts = filterQuery.split(' ').filter((part) => {
    const partLower = part.toLowerCase();
    // Skip if already present in base query
    if (baseLower.includes(partLower)) return false;

    // Skip color constraints if base already has color
    if (partLower.startsWith('c:') && /\bc[:=<>]/.test(baseLower)) return false;

    // Skip mv constraints if base already has mv
    if (partLower.startsWith('mv') && /\bmv[:=<>]/.test(baseLower))
      return false;

    return true;
  });

  if (filterParts.length === 0) return baseQuery;

  return `${baseQuery} ${filterParts.join(' ')}`.trim();
}

/**
 * Checks if a filter state has any active (non-default) filters.
 */
export function hasActiveServerFilters(
  filters?: FilterState | null,
  defaultMaxCmc: number = 16,
): boolean {
  if (!filters) return false;

  return (
    filters.colors.length > 0 ||
    filters.types.length > 0 ||
    filters.cmcRange[0] > 0 ||
    filters.cmcRange[1] < defaultMaxCmc ||
    (filters.sortBy !== 'name-asc' && filters.sortBy !== '')
  );
}
