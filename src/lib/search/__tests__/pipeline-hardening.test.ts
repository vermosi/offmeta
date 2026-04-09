/**
 * Golden tests for search pipeline hardening.
 * Validates client-side failure modes are properly handled:
 * - Card name queries resolved via client fallback
 * - Pre-translated patterns return correct results
 * - Client fallback produces valid queries for edge cases
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
    for (const [query, syntax] of Object.entries(PRETRANSLATED)) {
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

  it('handles single MTG keyword correctly', () => {
    const keywords = ['flying', 'trample', 'deathtouch', 'haste'];
    for (const kw of keywords) {
      const result = buildClientFallbackQuery(kw);
      expect(result).toContain(`kw:${kw}`);
    }
  });

  it('handles guild color names', () => {
    const guilds = [
      { name: 'azorius creatures', expected: 'id<=wu' },
      { name: 'dimir spells', expected: 'id<=ub' },
      { name: 'gruul beasts', expected: 'id<=rg' },
    ];
    for (const { name, expected } of guilds) {
      const result = buildClientFallbackQuery(name);
      expect(result).toContain(expected);
    }
  });
});
