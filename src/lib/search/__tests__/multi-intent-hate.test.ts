import { describe, expect, it } from 'vitest';
import { buildClientFallbackQuery } from '../fallback';

describe('buildClientFallbackQuery — multi-intent hate composition', () => {
  it('combines two hate intents joined by "and" with OR', () => {
    const q = buildClientFallbackQuery('punish treasure decks and stop tokens');
    expect(q).toMatch(/^\(.+ or .+\)$/);
    expect(q).toContain('artifact');
    expect(q).toContain('token');
  });

  it('combines three hate intents into one OR clause', () => {
    const q = buildClientFallbackQuery(
      'cards that punish graveyard decks and stop tokens and hate storm',
    );
    // Single top-level OR group containing all three hate syntaxes.
    expect(q.startsWith('(')).toBe(true);
    expect((q.match(/ or /g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(q).toMatch(/graveyard|exile/);
    expect(q).toMatch(/token/);
    expect(q).toMatch(/cast more than|spells cost/);
  });

  it('supports "plus" as an intent connector', () => {
    const q = buildClientFallbackQuery('hate lifegain plus stop tokens');
    expect(q).toMatch(/^\(.+ or .+\)$/);
    expect(q).toContain("gain life");
    expect(q).toContain('token');
  });

  it('keeps single-intent output un-wrapped (no synthetic OR group)', () => {
    const q = buildClientFallbackQuery('cards that punish treasure decks');
    // Single hate clause is already parenthesized by its own syntax, but the
    // top-level query is not wrapped again as `((...))`.
    expect(q.startsWith('((')).toBe(false);
    expect(q).toContain('artifact');
  });

  it('deduplicates identical hate patterns triggered twice', () => {
    const q = buildClientFallbackQuery('punish tokens and stop tokens');
    // Only one token clause — no OR-of-identical-syntaxes.
    expect((q.match(/tokens can't/g) ?? []).length).toBeLessThanOrEqual(1);
  });

  it('multi-intent output stays under the 700-char Scryfall budget', () => {
    const q = buildClientFallbackQuery(
      'punish treasure decks and stop tokens and hate graveyard and beat storm',
    );
    expect(q.length).toBeLessThanOrEqual(700);
  });
});
