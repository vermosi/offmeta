import type { FilterState } from '@/types/filters';
import {
  MAX_CMC,
  VALID_COLORS,
  VALID_FORMATS,
  VALID_SORTS,
  VALID_TYPES,
  parseBooleanFlag,
  parseCmcRange,
  parseEnum,
  parseEnumList,
} from '@/lib/search/url-params';

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function incrementSearchesPerSession(): void {
  const key = 'offmeta_searches_per_session';
  const current = parseInt(sessionStorage.getItem(key) || '0', 10);
  sessionStorage.setItem(key, String(current + 1));
}

/**
 * Reads filter state from URL params, discarding any value that isn't valid.
 * Malformed links degrade to defaults instead of corrupting the search state.
 */
export function parseFiltersFromUrl(
  params: URLSearchParams,
): Partial<FilterState> | null {
  const rawColors = params.get('colors');
  const rawTypes = params.get('types');
  const rawSort = params.get('sort');
  const cmcMin = params.get('cmc_min');
  const cmcMax = params.get('cmc_max');
  const rawFormat = params.get('format');
  const rawOwned = params.get('owned');

  if (
    !rawColors &&
    !rawTypes &&
    !rawSort &&
    !cmcMin &&
    !cmcMax &&
    !rawFormat &&
    !rawOwned
  ) {
    return null;
  }

  const result: Partial<FilterState> = {};

  const colors = parseEnumList(rawColors, VALID_COLORS);
  if (colors.length > 0) result.colors = colors;

  const types = parseEnumList(rawTypes, VALID_TYPES);
  if (types.length > 0) result.types = types;

  const sortBy = parseEnum(rawSort, VALID_SORTS);
  if (sortBy) result.sortBy = sortBy;

  const format = parseEnum(rawFormat, VALID_FORMATS);
  if (format) result.format = format;

  if (parseBooleanFlag(rawOwned)) result.ownedOnly = true;

  if (cmcMin !== null || cmcMax !== null) {
    const range = parseCmcRange(cmcMin, cmcMax);
    if (range[0] > 0 || range[1] < MAX_CMC) result.cmcRange = range;
  }

  return Object.keys(result).length > 0 ? result : null;
}


export function encodeFiltersToUrl(
  params: URLSearchParams,
  filters: FilterState | null,
): void {
  params.delete('colors');
  params.delete('types');
  params.delete('sort');
  params.delete('cmc_min');
  params.delete('cmc_max');
  params.delete('format');
  params.delete('owned');

  if (!filters) return;

  if (filters.colors.length > 0) params.set('colors', filters.colors.join(','));
  if (filters.types.length > 0) params.set('types', filters.types.join(','));
  if (filters.sortBy && filters.sortBy !== 'relevance-desc') {
    params.set('sort', filters.sortBy);
  }
  if (filters.format) params.set('format', filters.format);
  if (filters.ownedOnly) params.set('owned', '1');
  if (filters.cmcRange[0] > 0) {
    params.set('cmc_min', String(filters.cmcRange[0]));
  }
  if (filters.cmcRange[1] < 16) {
    params.set('cmc_max', String(filters.cmcRange[1]));
  }
}

/** URL params that make up the client-side filter state. */
export const FILTER_PARAM_KEYS = [
  'colors',
  'types',
  'sort',
  'cmc_min',
  'cmc_max',
  'format',
  'owned',
] as const;

/**
 * Stable signature of the filter-related params, used to detect when the URL
 * changed from the outside (browser back/forward) versus from our own writes.
 */
export function filterParamsSignature(params: URLSearchParams): string {
  return FILTER_PARAM_KEYS.map((key) => `${key}=${params.get(key) ?? ''}`).join(
    '&',
  );
}
