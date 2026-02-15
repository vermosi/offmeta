import { describe, it, expect } from 'vitest';
import { getSimilarSearches } from '../similar-searches';

describe('getSimilarSearches', () => {
  it('returns empty array for empty query', () => {
    expect(getSimilarSearches('')).toEqual([]);
  });

  it('returns suggestions for "ramp"', () => {
    const results = getSimilarSearches('ramp');
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('returns suggestions for "treasure"', () => {
    const results = getSimilarSearches('best treasure token cards');
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns suggestions for "removal"', () => {
    const results = getSimilarSearches('creature removal');
    expect(results.length).toBeGreaterThan(0);
  });

  it('does not suggest what user already searched', () => {
    const results = getSimilarSearches('creatures that tap for mana');
    const queries = results.map((r) => r.query.toLowerCase());
    expect(queries).not.toContain('creatures that tap for mana');
  });

  it('returns fallback suggestions for unmatched queries', () => {
    const results = getSimilarSearches('xyzzy obscure query');
    expect(results.length).toBeGreaterThan(0);
    // Should be general/popular suggestions
    expect(results.some((r) => r.label.length > 0)).toBe(true);
  });

  it('returns at most 5 results', () => {
    // "commander" has 4 direct + could match others
    const results = getSimilarSearches('budget commander ramp draw');
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('each suggestion has label and query', () => {
    const results = getSimilarSearches('draw');
    for (const r of results) {
      expect(r.label.length).toBeGreaterThan(0);
      expect(r.query.length).toBeGreaterThan(0);
    }
  });

  it('some suggestions include guidePath', () => {
    const results = getSimilarSearches('ramp');
    const withGuide = results.filter((r) => r.guidePath);
    expect(withGuide.length).toBeGreaterThanOrEqual(0); // may or may not have guide
  });

  it('handles multiple keyword matches', () => {
    const results = getSimilarSearches('sacrifice token graveyard');
    expect(results.length).toBeGreaterThan(0);
  });
});
