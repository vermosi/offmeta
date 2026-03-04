/**
 * Additional branch coverage tests for search/filters.ts.
 * Targets mergeQueryWithFilters dedup branches and hasActiveServerFilters edges.
 * @module lib/search/__tests__/filters-branches.test
 */

import { describe, it, expect } from 'vitest';
import {
  buildServerSideFilterQuery,
  mergeQueryWithFilters,
  hasActiveServerFilters,
} from '../filters';
import type { FilterState } from '@/types/filters';

describe('buildServerSideFilterQuery additional branches', () => {
  it('returns empty for null/undefined', () => {
    expect(buildServerSideFilterQuery(null)).toBe('');
    expect(buildServerSideFilterQuery(undefined)).toBe('');
  });

  it('handles single color (no parens wrapping)', () => {
    const filters: FilterState = { colors: ['R'], types: [], cmcRange: [0, 16], sortBy: '' };
    const result = buildServerSideFilterQuery(filters);
    expect(result).toBe('c:r');
    expect(result).not.toContain('(');
  });

  it('handles multiple colors with OR', () => {
    const filters: FilterState = { colors: ['R', 'G'], types: [], cmcRange: [0, 16], sortBy: '' };
    expect(buildServerSideFilterQuery(filters)).toBe('(c:r or c:g)');
  });

  it('handles colorless C', () => {
    const filters: FilterState = { colors: ['C'], types: [], cmcRange: [0, 16], sortBy: '' };
    expect(buildServerSideFilterQuery(filters)).toBe('c=c');
  });

  it('handles single type (no parens)', () => {
    const filters: FilterState = { colors: [], types: ['Dragon'], cmcRange: [0, 16], sortBy: '' };
    expect(buildServerSideFilterQuery(filters)).toBe('t:dragon');
  });

  it('handles multiple types with OR', () => {
    const filters: FilterState = { colors: [], types: ['Dragon', 'Angel'], cmcRange: [0, 16], sortBy: '' };
    expect(buildServerSideFilterQuery(filters)).toBe('(t:dragon or t:angel)');
  });

  it('appends sort order for non-default sortBy', () => {
    const filters: FilterState = { colors: [], types: [], cmcRange: [0, 16], sortBy: 'price-desc' };
    expect(buildServerSideFilterQuery(filters)).toBe('order:usd dir:desc');
  });

  it('appends sort order for cmc-asc', () => {
    const filters: FilterState = { colors: [], types: [], cmcRange: [0, 16], sortBy: 'cmc-asc' };
    expect(buildServerSideFilterQuery(filters)).toBe('order:cmc dir:asc');
  });

  it('skips sort for name-asc (default)', () => {
    const filters: FilterState = { colors: [], types: [], cmcRange: [0, 16], sortBy: 'name-asc' };
    expect(buildServerSideFilterQuery(filters)).toBe('');
  });

  it('skips sort for unknown sort field', () => {
    const filters: FilterState = { colors: [], types: [], cmcRange: [0, 16], sortBy: 'unknown-asc' };
    expect(buildServerSideFilterQuery(filters)).toBe('');
  });

  it('handles full combination', () => {
    const filters: FilterState = { colors: ['U'], types: ['Wizard'], cmcRange: [2, 4], sortBy: 'rarity-desc' };
    expect(buildServerSideFilterQuery(filters)).toBe('c:u t:wizard mv>=2 mv<=4 order:rarity dir:desc');
  });
});

describe('mergeQueryWithFilters', () => {
  it('returns base query when filter is empty', () => {
    expect(mergeQueryWithFilters('t:dragon', '')).toBe('t:dragon');
  });

  it('returns filter query when base is empty', () => {
    expect(mergeQueryWithFilters('', 'c:r')).toBe('c:r');
  });

  it('skips duplicate parts already in base', () => {
    expect(mergeQueryWithFilters('c:r t:creature', 'c:r')).toBe('c:r t:creature');
  });

  it('skips color filter when base already has color constraint', () => {
    const result = mergeQueryWithFilters('c:green t:elf', 'c:r');
    expect(result).toBe('c:green t:elf');
  });

  it('skips mv filter when base already has mv constraint', () => {
    const result = mergeQueryWithFilters('mv<=3 t:creature', 'mv>=1');
    expect(result).toBe('mv<=3 t:creature');
  });

  it('adds non-duplicate parts', () => {
    const result = mergeQueryWithFilters('t:creature', 'c:r mv<=3');
    expect(result).toBe('t:creature c:r mv<=3');
  });

  it('returns base when all filter parts are duplicates', () => {
    const result = mergeQueryWithFilters('c:r t:creature mv<=3', 'c:r t:creature mv<=3');
    expect(result).toBe('c:r t:creature mv<=3');
  });

  it('handles parenthesized filter parts', () => {
    const result = mergeQueryWithFilters('t:creature', '(c:r or c:g)');
    expect(result).toBe('t:creature (c:r or c:g)');
  });
});

describe('hasActiveServerFilters', () => {
  it('returns false for null/undefined', () => {
    expect(hasActiveServerFilters(null)).toBe(false);
    expect(hasActiveServerFilters(undefined)).toBe(false);
  });

  it('returns false for default filters', () => {
    const filters: FilterState = { colors: [], types: [], cmcRange: [0, 16], sortBy: 'name-asc' };
    expect(hasActiveServerFilters(filters)).toBe(false);
  });

  it('returns false for empty sortBy', () => {
    const filters: FilterState = { colors: [], types: [], cmcRange: [0, 16], sortBy: '' };
    expect(hasActiveServerFilters(filters)).toBe(false);
  });

  it('returns true when colors active', () => {
    const filters: FilterState = { colors: ['R'], types: [], cmcRange: [0, 16], sortBy: '' };
    expect(hasActiveServerFilters(filters)).toBe(true);
  });

  it('returns true when types active', () => {
    const filters: FilterState = { colors: [], types: ['Creature'], cmcRange: [0, 16], sortBy: '' };
    expect(hasActiveServerFilters(filters)).toBe(true);
  });

  it('returns true when min CMC > 0', () => {
    const filters: FilterState = { colors: [], types: [], cmcRange: [2, 16], sortBy: '' };
    expect(hasActiveServerFilters(filters)).toBe(true);
  });

  it('returns true when max CMC < default', () => {
    const filters: FilterState = { colors: [], types: [], cmcRange: [0, 10], sortBy: '' };
    expect(hasActiveServerFilters(filters)).toBe(true);
  });

  it('returns true for non-default sortBy', () => {
    const filters: FilterState = { colors: [], types: [], cmcRange: [0, 16], sortBy: 'price-desc' };
    expect(hasActiveServerFilters(filters)).toBe(true);
  });

  it('respects custom defaultMaxCmc', () => {
    const filters: FilterState = { colors: [], types: [], cmcRange: [0, 10], sortBy: '' };
    expect(hasActiveServerFilters(filters, 10)).toBe(false);
    expect(hasActiveServerFilters(filters, 16)).toBe(true);
  });
});
