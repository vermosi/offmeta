/**
 * Focused unit tests for individual strategy-hate archetypes.
 * Each phrase MUST compile to the exact Scryfall snippets emitted by
 * STRATEGY_HATE_PATTERNS in src/lib/search/fallback.ts, and MUST NOT
 * collapse to a naive single-noun oracle match.
 */
import { describe, it, expect } from 'vitest';
import { buildClientFallbackQuery } from '../fallback';

const HATE_VERBS = ['punish', 'hate', 'stop', 'shut down', 'hose', 'counter'];

function withVerbs(noun: string): string[] {
  return HATE_VERBS.map((v) => `cards that ${v} ${noun} decks`);
}

describe('buildClientFallbackQuery — token hate', () => {
  const EXPECTED =
    '(o:"tokens can\'t" or o:"exile all tokens" or o:"destroy all tokens")';

  it.each(withVerbs('token'))('%s → token hate syntax', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toContain(EXPECTED);
  });

  it('handles pluralized "tokens"', () => {
    expect(buildClientFallbackQuery('cards that punish tokens decks')).toContain(
      EXPECTED,
    );
  });

  it('does not collapse to naive o:"token"', () => {
    const q = buildClientFallbackQuery('cards that punish token decks');
    expect(q).not.toBe('o:"token"');
    expect(q).not.toBe('o:"tokens"');
  });
});

describe('buildClientFallbackQuery — lifegain hate', () => {
  const EXPECTED =
    '(o:"can\'t gain life" or o:"lose life instead" or (o:"whenever" o:"gains life"))';

  it.each([
    ...withVerbs('lifegain'),
    ...withVerbs('life gain'),
    ...withVerbs('life'),
  ])('%s → lifegain hate syntax', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toContain(EXPECTED);
  });

  it('does not collapse to naive o:"life" or o:"lifegain"', () => {
    const q = buildClientFallbackQuery('cards that punish lifegain decks');
    expect(q).not.toMatch(/^o:"life(gain)?"$/);
  });
});

describe('buildClientFallbackQuery — storm / combo hate', () => {
  const EXPECTED =
    '(o:"can\'t cast more than" or (o:"whenever" o:"opponent" o:"casts") or otag:hatebear or (o:"spells cost" o:"more"))';

  it.each([
    ...withVerbs('storm'),
    ...withVerbs('combo'),
    ...withVerbs('spellslinger'),
    ...withVerbs('spells'),
    ...withVerbs('instants and sorceries'),
  ])('%s → storm hate syntax', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toContain(EXPECTED);
  });

  it('does not collapse to naive o:"storm"', () => {
    expect(buildClientFallbackQuery('cards that punish storm decks')).not.toBe(
      'o:"storm"',
    );
  });
});

describe('buildClientFallbackQuery — control / counterspell hate', () => {
  const EXPECTED =
    '(o:"can\'t be countered" or (o:"whenever" o:"opponent" o:"counters") or otag:hatebear)';

  it.each([
    ...withVerbs('control'),
    ...withVerbs('counterspell'),
    ...withVerbs('countermagic'),
    ...withVerbs('counter magic'),
    ...withVerbs('permission'),
  ])('%s → control hate syntax', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toContain(EXPECTED);
  });

  it('does not collapse to naive o:"control"', () => {
    expect(buildClientFallbackQuery('cards that punish control decks')).not.toBe(
      'o:"control"',
    );
  });
});

describe('buildClientFallbackQuery — cross-archetype guarantees', () => {
  it.each([
    ['tokens', '(o:"tokens can\'t" or'],
    ['lifegain', '(o:"can\'t gain life" or'],
    ['storm', '(o:"can\'t cast more than" or'],
    ['control', '(o:"can\'t be countered" or'],
  ])(
    'every %s phrase produces a non-trivial, parenthesized OR clause',
    (_label, snippet) => {
      const q = buildClientFallbackQuery(`cards that punish ${_label} decks`);
      expect(q.length).toBeGreaterThan(snippet.length);
      expect(q).toContain(snippet);
      // Must be a compound OR expression, not a single-term match.
      expect(q).toMatch(/\bor\b/);
    },
  );

  it('leaves other clauses in the query intact (does not clobber colors)', () => {
    const q = buildClientFallbackQuery(
      'red cards that punish token decks',
    );
    expect(q).toContain('(o:"tokens can\'t"');
    expect(q).toMatch(/\bc:r\b/);
  });
});
