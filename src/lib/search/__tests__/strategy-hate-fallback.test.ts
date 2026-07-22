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
    'cards that punish treasure decks',
    'cards that hose treasure decks',
    'cards that stop artifact decks',
    'cards that shut down affinity decks',
  ])('artifact hate phrase: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toContain('otag:artifact-removal');
  });

  it.each([
    'cards that punish graveyard decks',
    'cards that hate reanimator decks',
    'cards that stop dredge decks',
    'cards that shut down mill decks',
  ])('graveyard hate phrase: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/otag:graveyard-hate|exile.*graveyard/);
  });

  it.each([
    'cards that punish storm decks',
    'cards that hate combo decks',
    'cards that stop spellslinger decks',
  ])('storm/combo hate phrase: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/can't cast more than|otag:hatebear|spells cost/);
  });

  it('translates "cards that punish token decks" to token hate', () => {
    const q = buildClientFallbackQuery('cards that punish token decks');
    expect(q).toMatch(/token|creatures your opponents control/i);
    expect(q).not.toBe('o:"token"');
  });

  it.each([
    'cards that punish lifegain decks',
    'cards that hate life gain decks',
  ])('lifegain hate: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q.length).toBeGreaterThan(0);
    expect(q).not.toMatch(/^o:"life(gain)?"$/);
  });

  it('translates "cards that punish ramp decks" to ramp hate', () => {
    const q = buildClientFallbackQuery('cards that punish ramp decks');
    expect(q).toMatch(/can't search|can't play additional lands|skip.*land|otag:hatebear/);
  });

  it('translates "cards that hate tutor decks" to tutor hate', () => {
    const q = buildClientFallbackQuery('cards that hate tutor decks');
    expect(q).toMatch(/can't search|otag:hatebear/);
  });

  it.each([
    'cards that punish card draw decks',
    'cards that hate draw decks',
    'cards that stop wheel decks',
  ])('draw hate: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/opponent.*draws|skip.*draw|can't draw more than|otag:hatebear/);
  });

  it.each([
    'cards that punish aggro decks',
    'cards that hate go-wide decks',
    'cards that stop weenie decks',
  ])('aggro/go-wide hate: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q.length).toBeGreaterThan(0);
    expect(q).not.toMatch(/^o:"(aggro|weenie|swarm)"$/);
  });

  it('translates "cards that punish enchantment decks" to enchantment hate', () => {
    const q = buildClientFallbackQuery('cards that punish enchantment decks');
    expect(q).toMatch(/enchantment|otag:enchantment-removal/i);
    expect(q).not.toBe('o:"enchantment"');
  });

  it.each([
    'cards that punish control decks',
    'cards that hate counterspell decks',
    'cards that stop permission decks',
  ])('control/counter hate: %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/can't be countered|opponent.*counters|otag:hatebear/);
  });

  it('runs hate patterns before generic slang (order sensitivity)', () => {
    // "treasure" alone should hit slang, but "punish treasure decks"
    // must resolve to hate first.
    const naive = buildClientFallbackQuery('treasure');
    const hate = buildClientFallbackQuery('cards that punish treasure decks');
    expect(hate).not.toEqual(naive);
    expect(hate).toContain('otag:artifact-removal');
  });
});
