/**
 * Golden tests for search pipeline hardening (client-side).
 * Validates client-side failure modes are properly handled.
 */

import { describe, it, expect } from 'vitest';
import { buildClientFallbackQuery, PRETRANSLATED } from '../fallback';

describe('Client Fallback Card Name Detection', () => {
  it('detects card names and wraps in exact name search', () => {
    const cardNames = ['Sol Ring', 'Lightning Bolt', "Thassa's Oracle"];
    for (const name of cardNames) {
      const result = buildClientFallbackQuery(name);
      expect(result).toBe(`!"${name}"`);
    }
  });

  it('does not treat search descriptions as card names', () => {
    const searches = [
      'creatures with flying',
      'cheap red burn spells',
      'cards that draw',
    ];
    for (const search of searches) {
      const result = buildClientFallbackQuery(search);
      expect(result).not.toMatch(/^!"/);
    }
  });

  it('returns non-empty fallback for any reasonable query', () => {
    const queries = [
      'red creatures with haste',
      'blue counterspells',
      'green ramp spells',
      'artifact removal',
      'board wipes',
      'mana dorks',
    ];
    for (const q of queries) {
      const result = buildClientFallbackQuery(q);
      expect(result.length).toBeGreaterThan(0);
    }
  });
});

describe('Pre-translated Query Coverage', () => {
  it('has pre-translated queries for common searches', () => {
    const commonQueries = [
      'dragons',
      'elf lords',
      'goblin lords',
      'mana rocks that cost 2',
      'artifacts that tap for blue',
      'commander staples under $3',
    ];
    for (const query of commonQueries) {
      expect(PRETRANSLATED[query]).toBeDefined();
    }
  });

  it('pre-translated queries contain valid Scryfall syntax', () => {
    for (const [, syntax] of Object.entries(PRETRANSLATED)) {
      expect(syntax.length).toBeGreaterThan(0);
      // Should not contain natural language words without operators
      expect(syntax).not.toMatch(/^[a-z\s]+$/);
    }
  });
});

describe('Client Fallback Edge Cases', () => {
  it('handles empty query gracefully', () => {
    expect(buildClientFallbackQuery('')).toBe('');
    expect(buildClientFallbackQuery('  ')).toBe('');
  });

  it('handles single MTG keywords', () => {
    // Single keywords go through SLANG_MAP or KEYWORD_WORDS
    expect(buildClientFallbackQuery('flying')).toContain('kw:flying');
    expect(buildClientFallbackQuery('haste')).toContain('kw:haste');
    expect(buildClientFallbackQuery('deathtouch')).toContain('kw:deathtouch');
  });

  it('handles slang terms', () => {
    expect(buildClientFallbackQuery('board wipes')).toContain('otag:boardwipe');
    expect(buildClientFallbackQuery('ramp')).toContain('otag:ramp');
    expect(buildClientFallbackQuery('removal')).toContain('otag:removal');
  });
});
