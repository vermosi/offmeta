import { describe, expect, it } from 'vitest';
import {
  MAX_CMC,
  MAX_QUERY_LENGTH,
  VALID_COLORS,
  VALID_SORTS,
  parseBooleanFlag,
  parseBoundedInt,
  parseCmcRange,
  parseEnum,
  parseEnumList,
  parseQueryParam,
  parseViewMode,
} from '@/lib/search/url-params';
import { parseFiltersFromUrl } from '@/lib/search/search-state';

describe('parseEnumList', () => {
  it('keeps only valid values with canonical casing', () => {
    expect(parseEnumList('w,u,zz,,R', VALID_COLORS)).toEqual(['W', 'U', 'R']);
  });
  it('dedupes and handles null', () => {
    expect(parseEnumList('W,W', VALID_COLORS)).toEqual(['W']);
    expect(parseEnumList(null, VALID_COLORS)).toEqual([]);
  });
});

describe('parseEnum', () => {
  it('returns undefined for unknown values', () => {
    expect(parseEnum('bogus', VALID_SORTS)).toBeUndefined();
    expect(parseEnum('NAME-ASC', VALID_SORTS)).toBe('name-asc');
  });
});

describe('parseBoundedInt', () => {
  it('falls back on garbage and out-of-range input', () => {
    expect(parseBoundedInt('abc', 0, 16, 3)).toBe(3);
    expect(parseBoundedInt('999', 0, 16, 0)).toBe(0);
    expect(parseBoundedInt('-5', 0, 16, 0)).toBe(0);
    expect(parseBoundedInt('4', 0, 16, 0)).toBe(4);
  });
});

describe('parseCmcRange', () => {
  it('clamps and swaps reversed bounds', () => {
    expect(parseCmcRange('8', '2')).toEqual([2, 8]);
    expect(parseCmcRange('x', 'y')).toEqual([0, MAX_CMC]);
  });
});

describe('parseBooleanFlag', () => {
  it('accepts common truthy strings', () => {
    expect(parseBooleanFlag('1')).toBe(true);
    expect(parseBooleanFlag('true')).toBe(true);
    expect(parseBooleanFlag('0')).toBe(false);
    expect(parseBooleanFlag(null)).toBe(false);
  });
});

describe('parseQueryParam', () => {
  it('normalizes whitespace and enforces max length', () => {
    expect(parseQueryParam('  red   treasure\n ')).toBe('red treasure');
    expect(parseQueryParam('a'.repeat(600))).toHaveLength(MAX_QUERY_LENGTH);
    expect(parseQueryParam(null)).toBe('');
  });
});

describe('parseViewMode', () => {
  it('only allows grid/list', () => {
    expect(parseViewMode('list')).toBe('list');
    expect(parseViewMode('gallery')).toBeUndefined();
  });
});

describe('parseFiltersFromUrl', () => {
  it('returns null when nothing valid is present', () => {
    expect(parseFiltersFromUrl(new URLSearchParams('sort=nope&colors=zz'))).toBeNull();
    expect(parseFiltersFromUrl(new URLSearchParams(''))).toBeNull();
  });
  it('parses valid values and drops invalid ones', () => {
    const result = parseFiltersFromUrl(
      new URLSearchParams('colors=w,zz&types=creature,foo&sort=cmc-asc&format=BOGUS&owned=true&cmc_min=9&cmc_max=1'),
    );
    expect(result).toEqual({
      colors: ['W'],
      types: ['Creature'],
      sortBy: 'cmc-asc',
      ownedOnly: true,
      cmcRange: [1, 9],
    });
  });
});
