import { describe, it, expect } from 'vitest';
import { queryToSlug, slugToQuery } from '../search-slug';

describe('queryToSlug', () => {
  it('converts simple queries', () => {
    expect(queryToSlug('cheap green ramp')).toBe('cheap-green-ramp');
  });

  it('handles special characters', () => {
    expect(queryToSlug('creatures that ETB & draw')).toBe('creatures-that-etb-draw');
  });

  it('handles apostrophes', () => {
    expect(queryToSlug("Sensei's Divining Top")).toBe('senseis-divining-top');
  });

  it('collapses multiple spaces/hyphens', () => {
    expect(queryToSlug('red   burn   spells')).toBe('red-burn-spells');
  });

  it('truncates long queries', () => {
    const long = 'a '.repeat(100).trim();
    expect(queryToSlug(long).length).toBeLessThanOrEqual(80);
  });

  it('does not end with a hyphen after truncation', () => {
    const slug = queryToSlug('a '.repeat(50).trim());
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('slugToQuery', () => {
  it('converts slugs back to queries', () => {
    expect(slugToQuery('cheap-green-ramp')).toBe('cheap green ramp');
  });

  it('handles URL-encoded slugs', () => {
    expect(slugToQuery('creatures-that-make-treasure')).toBe('creatures that make treasure');
  });

  it('round-trips simple queries', () => {
    const query = 'mono red stax pieces';
    expect(slugToQuery(queryToSlug(query))).toBe(query);
  });
});
