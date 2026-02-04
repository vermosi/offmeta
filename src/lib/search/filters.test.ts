/**
 * Tests for server-side filter utilities.
 * @module lib/search/filters.test
 */

import { describe, it, expect } from 'vitest';
import {
  buildServerSideFilterQuery,
  mergeQueryWithFilters,
  hasActiveServerFilters,
} from './filters';
import type { FilterState } from '@/types/filters';

describe('buildServerSideFilterQuery', () => {
  const defaultFilters: FilterState = {
    colors: [],
    types: [],
    cmcRange: [0, 16],
    sortBy: 'name-asc',
  };

  it('returns empty string for null/undefined filters', () => {
    expect(buildServerSideFilterQuery(null)).toBe('');
    expect(buildServerSideFilterQuery(undefined)).toBe('');
  });

  it('returns empty string for default filters', () => {
    expect(buildServerSideFilterQuery(defaultFilters)).toBe('');
  });

  describe('color filters', () => {
    it('builds single color filter', () => {
      const filters: FilterState = { ...defaultFilters, colors: ['R'] };
      expect(buildServerSideFilterQuery(filters)).toBe('c:r');
    });

    it('builds multiple colors with OR logic', () => {
      const filters: FilterState = { ...defaultFilters, colors: ['R', 'G'] };
      expect(buildServerSideFilterQuery(filters)).toBe('(c:r or c:g)');
    });

    it('handles colorless (C) specially', () => {
      const filters: FilterState = { ...defaultFilters, colors: ['C'] };
      expect(buildServerSideFilterQuery(filters)).toBe('c=c');
    });

    it('combines colorless with other colors', () => {
      const filters: FilterState = { ...defaultFilters, colors: ['C', 'U'] };
      expect(buildServerSideFilterQuery(filters)).toBe('(c=c or c:u)');
    });
  });

  describe('type filters', () => {
    it('builds single type filter', () => {
      const filters: FilterState = { ...defaultFilters, types: ['Creature'] };
      expect(buildServerSideFilterQuery(filters)).toBe('t:creature');
    });

    it('builds multiple types with OR logic', () => {
      const filters: FilterState = { ...defaultFilters, types: ['Creature', 'Instant'] };
      expect(buildServerSideFilterQuery(filters)).toBe('(t:creature or t:instant)');
    });
  });

  describe('CMC range filters', () => {
    it('builds min CMC filter', () => {
      const filters: FilterState = { ...defaultFilters, cmcRange: [2, 16] };
      expect(buildServerSideFilterQuery(filters)).toBe('mv>=2');
    });

    it('builds max CMC filter', () => {
      const filters: FilterState = { ...defaultFilters, cmcRange: [0, 5] };
      expect(buildServerSideFilterQuery(filters)).toBe('mv<=5');
    });

    it('builds both min and max CMC', () => {
      const filters: FilterState = { ...defaultFilters, cmcRange: [2, 5] };
      expect(buildServerSideFilterQuery(filters)).toBe('mv>=2 mv<=5');
    });

    it('ignores default max CMC (16)', () => {
      const filters: FilterState = { ...defaultFilters, cmcRange: [3, 16] };
      expect(buildServerSideFilterQuery(filters)).toBe('mv>=3');
    });
  });

  describe('sorting', () => {
    it('ignores default sort (name-asc)', () => {
      const filters: FilterState = { ...defaultFilters, sortBy: 'name-asc' };
      expect(buildServerSideFilterQuery(filters)).toBe('');
    });

    it('builds CMC ascending sort', () => {
      const filters: FilterState = { ...defaultFilters, sortBy: 'cmc-asc' };
      expect(buildServerSideFilterQuery(filters)).toBe('order:cmc dir:asc');
    });

    it('builds price descending sort', () => {
      const filters: FilterState = { ...defaultFilters, sortBy: 'price-desc' };
      expect(buildServerSideFilterQuery(filters)).toBe('order:usd dir:desc');
    });

    it('builds rarity sort', () => {
      const filters: FilterState = { ...defaultFilters, sortBy: 'rarity-asc' };
      expect(buildServerSideFilterQuery(filters)).toBe('order:rarity dir:asc');
    });
  });

  describe('combined filters', () => {
    it('combines all filter types', () => {
      const filters: FilterState = {
        colors: ['R', 'G'],
        types: ['Creature'],
        cmcRange: [2, 5],
        sortBy: 'cmc-desc',
      };
      const result = buildServerSideFilterQuery(filters);
      expect(result).toContain('(c:r or c:g)');
      expect(result).toContain('t:creature');
      expect(result).toContain('mv>=2');
      expect(result).toContain('mv<=5');
      expect(result).toContain('order:cmc');
      expect(result).toContain('dir:desc');
    });
  });
});

describe('mergeQueryWithFilters', () => {
  it('returns base query when filter query is empty', () => {
    expect(mergeQueryWithFilters('t:creature', '')).toBe('t:creature');
  });

  it('returns filter query when base query is empty', () => {
    expect(mergeQueryWithFilters('', 'c:r')).toBe('c:r');
  });

  it('combines base and filter queries', () => {
    expect(mergeQueryWithFilters('t:creature', 'c:r')).toBe('t:creature c:r');
  });

  it('removes duplicate constraints', () => {
    expect(mergeQueryWithFilters('t:creature c:r', 'c:r')).toBe('t:creature c:r');
  });

  it('removes redundant color constraints', () => {
    expect(mergeQueryWithFilters('c:blue', 'c:r')).toBe('c:blue');
  });

  it('removes redundant mv constraints', () => {
    expect(mergeQueryWithFilters('mv>=3', 'mv>=2')).toBe('mv>=3');
  });

  it('preserves non-duplicate parts', () => {
    const result = mergeQueryWithFilters('t:creature', 'c:r order:cmc');
    expect(result).toBe('t:creature c:r order:cmc');
  });
});

describe('hasActiveServerFilters', () => {
  const defaultFilters: FilterState = {
    colors: [],
    types: [],
    cmcRange: [0, 16],
    sortBy: 'name-asc',
  };

  it('returns false for null/undefined', () => {
    expect(hasActiveServerFilters(null)).toBe(false);
    expect(hasActiveServerFilters(undefined)).toBe(false);
  });

  it('returns false for default filters', () => {
    expect(hasActiveServerFilters(defaultFilters)).toBe(false);
  });

  it('returns true when colors are selected', () => {
    expect(hasActiveServerFilters({ ...defaultFilters, colors: ['R'] })).toBe(true);
  });

  it('returns true when types are selected', () => {
    expect(hasActiveServerFilters({ ...defaultFilters, types: ['Creature'] })).toBe(true);
  });

  it('returns true when min CMC is set', () => {
    expect(hasActiveServerFilters({ ...defaultFilters, cmcRange: [2, 16] })).toBe(true);
  });

  it('returns true when max CMC is set', () => {
    expect(hasActiveServerFilters({ ...defaultFilters, cmcRange: [0, 10] })).toBe(true);
  });

  it('returns true for non-default sort', () => {
    expect(hasActiveServerFilters({ ...defaultFilters, sortBy: 'cmc-desc' })).toBe(true);
  });

  it('returns false for empty sort', () => {
    expect(hasActiveServerFilters({ ...defaultFilters, sortBy: '' })).toBe(false);
  });

  it('accepts custom default max CMC', () => {
    const filters = { ...defaultFilters, cmcRange: [0, 10] as [number, number] };
    expect(hasActiveServerFilters(filters, 10)).toBe(false);
    expect(hasActiveServerFilters(filters, 16)).toBe(true);
  });
});
