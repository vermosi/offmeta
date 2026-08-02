/**
 * Validation helpers for search-related URL parameters.
 *
 * Malformed, hand-edited, or stale links must never break the search state:
 * every parser here either returns a valid value or falls back to a safe
 * default, and always drops values it cannot recognise.
 *
 * @module lib/search/url-params
 */

/** Maximum accepted length of the free-text query param (matches input limit). */
export const MAX_QUERY_LENGTH = 500;

/** Upper bound of the mana-value range slider. */
export const MAX_CMC = 16;

/** Colors accepted in the `colors` param (WUBRG + colorless). */
export const VALID_COLORS = ['W', 'U', 'B', 'R', 'G', 'C'] as const;

/** Card types accepted in the `types` param (canonical casing). */
export const VALID_TYPES = [
  'Creature',
  'Instant',
  'Sorcery',
  'Enchantment',
  'Artifact',
  'Planeswalker',
  'Land',
  'Battle',
] as const;

/** Sort keys accepted in the `sort` param. */
export const VALID_SORTS = [
  'relevance-desc',
  'name-asc',
  'name-desc',
  'cmc-asc',
  'cmc-desc',
  'price-asc',
  'price-desc',
  'rarity-asc',
  'rarity-desc',
  'edhrec-asc',
  'edhrec-desc',
] as const;

/** Format legality values accepted in the `format` param. */
export const VALID_FORMATS = [
  'commander',
  'modern',
  'standard',
  'pioneer',
  'pauper',
  'legacy',
  'vintage',
  'premodern',
  'historic',
  'explorer',
  'timeless',
  'duel',
  'penny',
  'oathbreaker',
  'paupercommander',
  'brawl',
] as const;

/** View modes accepted in the `view` param. */
export const VALID_VIEW_MODES = ['grid', 'list'] as const;

export type ViewModeParam = (typeof VALID_VIEW_MODES)[number];

/** Max entries kept from a comma-separated list param (guards absurd links). */
const MAX_LIST_ITEMS = 32;

/**
 * Splits a comma-separated param and keeps only values present in `allowed`.
 * Matching is case-insensitive; the canonical casing from `allowed` is returned.
 * Duplicates are removed and the result is capped at {@link MAX_LIST_ITEMS}.
 */
export function parseEnumList(
  raw: string | null,
  allowed: readonly string[],
): string[] {
  if (!raw) return [];
  const lookup = new Map(allowed.map((value) => [value.toLowerCase(), value]));
  const seen = new Set<string>();
  const result: string[] = [];

  for (const part of raw.split(',')) {
    const canonical = lookup.get(part.trim().toLowerCase());
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);
    result.push(canonical);
    if (result.length >= MAX_LIST_ITEMS) break;
  }
  return result;
}

/** Returns the canonical value when `raw` is in `allowed`, otherwise `undefined`. */
export function parseEnum<T extends string>(
  raw: string | null,
  allowed: readonly T[],
): T | undefined {
  if (!raw) return undefined;
  const needle = raw.trim().toLowerCase();
  return allowed.find((value) => value.toLowerCase() === needle);
}

/**
 * Parses a bounded integer. Non-numeric, NaN, Infinity, and out-of-range
 * values fall back to `fallback`; in-range floats are truncated.
 */
export function parseBoundedInt(
  raw: string | null,
  min: number,
  max: number,
  fallback: number,
): number {
  if (raw === null || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  const truncated = Math.trunc(parsed);
  if (truncated < min || truncated > max) return fallback;
  return truncated;
}

/**
 * Parses a `[min, max]` mana-value range, clamping to `[0, MAX_CMC]` and
 * swapping reversed bounds so the range is always ascending.
 */
export function parseCmcRange(
  rawMin: string | null,
  rawMax: string | null,
): [number, number] {
  let min = parseBoundedInt(rawMin, 0, MAX_CMC, 0);
  let max = parseBoundedInt(rawMax, 0, MAX_CMC, MAX_CMC);
  if (min > max) [min, max] = [max, min];
  return [min, max];
}

/** Truthy flag parsing: accepts `1`, `true`, `yes` (case-insensitive). */
export function parseBooleanFlag(raw: string | null): boolean {
  if (!raw) return false;
  const value = raw.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

/**
 * Normalizes the free-text `q` param: trims, collapses whitespace, strips
 * control characters, and enforces {@link MAX_QUERY_LENGTH}.
 */
export function parseQueryParam(raw: string | null): string {
  if (!raw) return '';
  return raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}

/** Parses the `view` param, defaulting to `undefined` when unrecognised. */
export function parseViewMode(raw: string | null): ViewModeParam | undefined {
  return parseEnum(raw, VALID_VIEW_MODES);
}
