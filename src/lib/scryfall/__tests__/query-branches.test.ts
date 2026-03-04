/**
 * Additional branch coverage tests for scryfall/query.ts.
 * Targets uncovered branches in normalizeOrGroups, validateScryfallQuery, buildFilterQuery.
 * @module lib/scryfall/__tests__/query-branches.test
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeOrGroups,
  validateScryfallQuery,
  buildFilterQuery,
} from '@/lib/scryfall/query';
import type { FilterState } from '@/types/filters';

describe('normalizeOrGroups additional branches', () => {
  it('handles empty string', () => {
    expect(normalizeOrGroups('')).toBe('');
  });

  it('handles query with no OR', () => {
    expect(normalizeOrGroups('t:creature c:green')).toBe('t:creature c:green');
  });

  it('handles OR at end without following token', () => {
    // OR with previous but no next → still flushes group
    const result = normalizeOrGroups('c:red OR');
    expect(result).toContain('c:red');
  });

  it('handles trailing OR group (inOrGroup at end of tokens)', () => {
    const result = normalizeOrGroups('t:elf c:red OR c:blue');
    expect(result).toBe('t:elf (c:red OR c:blue)');
  });

  it('handles OR group with no previous token', () => {
    // OR at start — no previous to pop
    const result = normalizeOrGroups('OR c:red');
    expect(result).toContain('c:red');
  });

  it('handles escaped regex delimiter', () => {
    // Backslash before / should not toggle inRegex
    const result = normalizeOrGroups('o:\\/test c:red OR c:blue');
    expect(result).toContain('OR');
  });

  it('handles multiple consecutive spaces', () => {
    expect(normalizeOrGroups('c:red   OR   c:blue')).toBe('(c:red OR c:blue)');
  });

  it('handles nested parentheses with OR inside', () => {
    // OR inside nested parens should not be treated as top-level
    const query = '((c:red OR c:blue)) t:dragon';
    expect(normalizeOrGroups(query)).toBe(query);
  });

  it('handles OR right after closing paren (depthBefore > 0)', () => {
    const query = '(c:red) OR c:blue';
    const result = normalizeOrGroups(query);
    expect(result).toContain('OR');
  });

  it('handles inOrGroup with depth > 0 token', () => {
    // Token inside parens while in OR group
    const query = 'c:red OR (c:blue c:black)';
    const result = normalizeOrGroups(query);
    expect(result).toContain('OR');
  });
});

describe('validateScryfallQuery additional branches', () => {
  it('handles empty query', () => {
    const result = validateScryfallQuery('');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('');
  });

  it('handles query with only whitespace', () => {
    const result = validateScryfallQuery('   \n\r  ');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('');
  });

  it('handles multiple unknown search keys', () => {
    const result = validateScryfallQuery('foo:bar baz:qux t:elf');
    expect(result.sanitized).toBe('t:elf');
    expect(result.issues[0]).toContain('foo');
    expect(result.issues[0]).toContain('baz');
  });

  it('handles multiple unknown oracle tags', () => {
    const result = validateScryfallQuery('otag:fake1 otag:fake2 t:goblin');
    expect(result.sanitized).toBe('t:goblin');
    expect(result.issues).toContainEqual(expect.stringContaining('fake1'));
  });

  it('detects and removes malformed nested-quote oracle clauses', () => {
    // Pattern requires o:"...t:... or o:..."..." (nested quote with search key inside)
    const result = validateScryfallQuery('o:"create t:creature token"extra" t:elf');
    expect(result.issues).toContainEqual(expect.stringContaining('nested-quote'));
    expect(result.sanitized).toContain('t:elf');
  });

  it('preserves valid queries with operators like <= and >=', () => {
    const result = validateScryfallQuery('mv<=3 pow>=2');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('mv<=3 pow>=2');
  });

  it('handles power+toughness with different spacing', () => {
    const result = validateScryfallQuery('power + toughness >= 5');
    expect(result.issues).toContainEqual(expect.stringContaining('power+toughness'));
  });

  it('handles e:YYYY with uppercase', () => {
    const result = validateScryfallQuery('e:2023');
    expect(result.sanitized).toContain('year=2023');
  });
});

describe('buildFilterQuery additional branches', () => {
  it('returns empty string for null filters', () => {
    expect(buildFilterQuery(null)).toBe('');
    expect(buildFilterQuery(undefined)).toBe('');
  });

  it('handles single color', () => {
    const filters: FilterState = { colors: ['R'], types: [], cmcRange: [0, 16], sortBy: '' };
    expect(buildFilterQuery(filters)).toBe('(c:r)');
  });

  it('handles single type', () => {
    const filters: FilterState = { colors: [], types: ['Dragon'], cmcRange: [0, 16], sortBy: '' };
    expect(buildFilterQuery(filters)).toBe('(t:dragon)');
  });

  it('handles only min CMC', () => {
    const filters: FilterState = { colors: [], types: [], cmcRange: [3, 16], sortBy: '' };
    expect(buildFilterQuery(filters)).toBe('mv>=3');
  });

  it('handles only max CMC', () => {
    const filters: FilterState = { colors: [], types: [], cmcRange: [0, 5], sortBy: '' };
    expect(buildFilterQuery(filters)).toBe('mv<=5');
  });
});
