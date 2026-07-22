/**
 * Regression tests for strategy-hate / hoser phrase compilation in the
 * client-side fallback translator. These phrases MUST match before generic
 * SLANG_MAP tokens so that e.g. "punish treasure decks" doesn't collapse
 * into a naive o:"treasure" query.
 */

import { describe, it, expect } from 'vitest';
import { buildClientFallbackQuery } from '../fallback';

describe('buildClientFallbackQuery — strategy hate patterns', () => {
  it('translates "cards that punish treasure decks" to artifact hate', () => {
    const q = buildClientFallbackQuery('cards that punish treasure decks');
    expect(q).toContain('otag:artifact-removal');
    expect(q).toContain('activated abilities of artifacts');
    // Should NOT collapse to naive treasure slang
    expect(q).not.toMatch(/^o:"treasure"$/);
  });

  it.each([
    'punish treasure decks',
    'hose treasure',
    'stop artifact decks',
    'cards that shut down affinity',
    'anti-artifact',
  ])('artifact hate phrase: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toContain('otag:artifact-removal');
  });

  it.each([
    'punish graveyard decks',
    'hate reanimator',
    'cards that stop dredge',
    'shut down mill',
  ])('graveyard hate phrase: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/otag:graveyard-hate|exile.*graveyard/);
  });

  it.each(['punish storm decks', 'hate combo', 'stop spellslinger decks'])(
    'storm/combo hate phrase: %s',
    (input) => {
      const q = buildClientFallbackQuery(input);
      expect(q).toMatch(/can't cast more than|otag:hatebear|spells cost/);
    },
  );

  it('translates "punish token decks" to token hate', () => {
    const q = buildClientFallbackQuery('punish token decks');
    expect(q).toMatch(/token|creatures your opponents control/i);
    expect(q).not.toBe('o:"token"');
  });

  it.each(['punish lifegain decks', 'hate life gain'])(
    'lifegain hate: %s',
    (input) => {
      const q = buildClientFallbackQuery(input);
      expect(q.length).toBeGreaterThan(0);
      expect(q).not.toMatch(/^o:"life(gain)?"$/);
    },
  );

  it('translates "punish ramp decks" to ramp hate', () => {
    const q = buildClientFallbackQuery('punish ramp decks');
    expect(q).toMatch(/can't search|can't play additional lands|skip.*land|otag:hatebear/);
  });

  it('translates "hate tutors" to tutor hate', () => {
    const q = buildClientFallbackQuery('hate tutors');
    expect(q).toMatch(/can't search|otag:hatebear/);
  });

  it.each(['punish card draw', 'hate draw decks', 'stop wheel decks'])(
    'draw hate: %s',
    (input) => {
      const q = buildClientFallbackQuery(input);
      expect(q).toMatch(/opponent.*draws|skip.*draw|can't draw more than|otag:hatebear/);
    },
  );

  it.each(['punish aggro', 'hate go-wide decks', 'stop weenie decks'])(
    'aggro/go-wide hate: %s',
    (input) => {
      const q = buildClientFallbackQuery(input);
      expect(q.length).toBeGreaterThan(0);
      // Should not collapse to a bare oracle keyword
      expect(q).not.toMatch(/^o:"(aggro|weenie|swarm)"$/);
    },
  );

  it('translates "punish enchantment decks" to enchantment hate', () => {
    const q = buildClientFallbackQuery('punish enchantment decks');
    expect(q).toMatch(/enchantment|otag:enchantment-removal/i);
    expect(q).not.toBe('o:"enchantment"');
  });

  it.each(['punish control decks', 'hate counterspells', 'stop permission'])(
    'control/counter hate: %s',
    (input) => {
      const q = buildClientFallbackQuery(input);
      expect(q).toMatch(/can't be countered|opponent.*counters|otag:hatebear/);
    },
  );

  it('runs hate patterns before generic slang (order sensitivity)', () => {
    // "treasure" alone should hit slang, but "punish treasure decks"
    // must resolve to hate first.
    const naive = buildClientFallbackQuery('treasure');
    const hate = buildClientFallbackQuery('cards that punish treasure decks');
    expect(hate).not.toEqual(naive);
    expect(hate).toContain('otag:artifact-removal');
  });
});
