import { describe, expect, it } from 'vitest';
import {
  buildFilterQuery,
  normalizeOrGroups,
  validateScryfallQuery,
} from '@/lib/scryfall/query';
import type { FilterState } from '@/types/filters';

describe('normalizeOrGroups', () => {
  it('wraps top-level OR groups in parentheses', () => {
    expect(normalizeOrGroups('c:red OR c:blue')).toBe('(c:red OR c:blue)');
  });

  it('handles multiple OR groups in the same query', () => {
    const query = 'c:red OR c:blue t:dragon OR t:angel';
    expect(normalizeOrGroups(query)).toBe(
      '(c:red OR c:blue) (t:dragon OR t:angel)',
    );
  });

  it('ignores OR inside parentheses', () => {
    const query = 'c:red (t:dragon OR t:angel)';
    expect(normalizeOrGroups(query)).toBe(query);
  });

  it('does not split on quoted text', () => {
    const query = 'o:"draw OR discard" c:red OR c:blue';
    expect(normalizeOrGroups(query)).toBe(
      'o:"draw OR discard" (c:red OR c:blue)',
    );
  });

  it('ignores OR inside regex patterns', () => {
    const query = 'o:/draw OR discard/ c:red OR c:blue';
    expect(normalizeOrGroups(query)).toBe(
      'o:/draw OR discard/ (c:red OR c:blue)',
    );
  });
});

describe('validateScryfallQuery', () => {
  it('replaces year set syntax with year=YYYY', () => {
    const result = validateScryfallQuery('e:2020 t:dragon');
    expect(result.valid).toBe(false);
    expect(result.sanitized).toBe('year=2020 t:dragon');
    expect(result.issues).toContain(
      'Replaced invalid year set syntax with year=YYYY',
    );
  });

  it('removes unsupported power+toughness math expressions', () => {
    const result = validateScryfallQuery('pow + tou >= 5 t:angel');
    expect(result.valid).toBe(false);
    expect(result.sanitized).toBe('t:angel');
    expect(result.issues).toContain('Removed unsupported power+toughness math');
  });

  it('strips unknown search keys', () => {
    const result = validateScryfallQuery('foo:bar t:elf');
    expect(result.valid).toBe(false);
    expect(result.sanitized).toBe('t:elf');
    expect(result.issues).toContain('Unknown search key(s): foo');
  });

  it('removes unknown oracle tags', () => {
    const result = validateScryfallQuery('otag:madeup t:goblin');
    expect(result.valid).toBe(false);
    expect(result.sanitized).toBe('t:goblin');
    expect(result.issues).toContain('Unknown oracle tag(s): madeup');
  });

  it('keeps valid queries unchanged', () => {
    const query = 't:elf c:g mv<=3';
    const result = validateScryfallQuery(query);
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe(query);
    expect(result.issues).toEqual([]);
  });

  it('normalizes OR groups before validation', () => {
    const result = validateScryfallQuery('c:red OR c:blue foo:bar');
    expect(result.sanitized).toBe('(c:red OR c:blue)');
    expect(result.issues).toContain('Normalized OR groups with parentheses');
    expect(result.issues).toContain('Unknown search key(s): foo');
  });
});

describe('buildFilterQuery', () => {
  it('returns an empty string for empty filters', () => {
    const filters: FilterState = {
      colors: [],
      types: [],
      cmcRange: [0, 16],
      sortBy: 'name',
    };
    expect(buildFilterQuery(filters)).toBe('');
  });

  it('builds color filters including colorless', () => {
    const filters: FilterState = {
      colors: ['G', 'C'],
      types: [],
      cmcRange: [0, 16],
      sortBy: 'name',
    };
    expect(buildFilterQuery(filters)).toBe('(c:g OR c=c)');
  });

  it('builds type filters', () => {
    const filters: FilterState = {
      colors: [],
      types: ['Dragon', 'Angel'],
      cmcRange: [0, 16],
      sortBy: 'name',
    };
    expect(buildFilterQuery(filters)).toBe('(t:dragon OR t:angel)');
  });

  it('adds mana value bounds when present', () => {
    const filters: FilterState = {
      colors: [],
      types: [],
      cmcRange: [2, 5],
      sortBy: 'name',
    };
    expect(buildFilterQuery(filters)).toBe('mv>=2 mv<=5');
  });

  it('combines multiple filter sections', () => {
    const filters: FilterState = {
      colors: ['U', 'B'],
      types: ['Wizard'],
      cmcRange: [1, 3],
      sortBy: 'name',
    };
    expect(buildFilterQuery(filters)).toBe(
      '(c:u OR c:b) (t:wizard) mv>=1 mv<=3',
    );
  });
});
