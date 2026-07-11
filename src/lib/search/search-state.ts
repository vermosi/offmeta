import type { FilterState } from '@/types/filters';

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function incrementSearchesPerSession(): void {
  const key = 'offmeta_searches_per_session';
  const current = parseInt(sessionStorage.getItem(key) || '0', 10);
  sessionStorage.setItem(key, String(current + 1));
}

export function parseFiltersFromUrl(
  params: URLSearchParams,
): Partial<FilterState> | null {
  const colors = params.get('colors');
  const types = params.get('types');
  const sort = params.get('sort');
  const cmcMin = params.get('cmc_min');
  const cmcMax = params.get('cmc_max');
  const format = params.get('format');

  if (!colors && !types && !sort && !cmcMin && !cmcMax && !format) return null;

  const result: Partial<FilterState> = {};
  if (colors) result.colors = colors.split(',').filter(Boolean);
  if (types) result.types = types.split(',').filter(Boolean);
  if (sort) result.sortBy = sort;
  if (format) result.format = format;
  if (cmcMin || cmcMax) {
    result.cmcRange = [
      cmcMin ? parseInt(cmcMin, 10) : 0,
      cmcMax ? parseInt(cmcMax, 10) : 16,
    ];
  }
  return result;
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

  if (!filters) return;

  if (filters.colors.length > 0) params.set('colors', filters.colors.join(','));
  if (filters.types.length > 0) params.set('types', filters.types.join(','));
  if (filters.sortBy && filters.sortBy !== 'name-asc') {
    params.set('sort', filters.sortBy);
  }
  if (filters.format) params.set('format', filters.format);
  if (filters.cmcRange[0] > 0) {
    params.set('cmc_min', String(filters.cmcRange[0]));
  }
  if (filters.cmcRange[1] < 16) {
    params.set('cmc_max', String(filters.cmcRange[1]));
  }
}
