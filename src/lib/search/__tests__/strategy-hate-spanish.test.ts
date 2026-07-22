/**
 * Spanish-language regression tests for strategy-hate compilation in the
 * client-side fallback translator. Mirrors the English archetype coverage
 * so that Spanish speakers get the same high-quality hate syntax.
 */

import { describe, it, expect } from 'vitest';
import { buildClientFallbackQuery } from '../fallback';

describe('buildClientFallbackQuery — Spanish strategy hate', () => {
  it.each([
    'cartas que castigan mazos de tesoros',
    'cartas que odian artefactos',
    'cartas que detienen mazos de tesoro',
    'cartas que detienen mazos de tesoro',
  ])('artifact/treasure hate (es): %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toContain('otag:artifact-removal');
  });

  it.each([
    'cartas que castigan mazos de cementerio',
    'cartas que odian reanimación',
    'cartas que paran el cementerio',
  ])('graveyard hate (es): %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/otag:graveyard-hate|exile.*graveyard/);
  });

  it.each([
    'cartas que castigan tormenta',
    'cartas que odian hechizos',
    'cartas que detienen combo',
  ])('storm/spell hate (es): %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/can't cast more than|opponent.*casts|hatebear|spells cost/);
  });

  it.each([
    'cartas que castigan fichas',
    'cartas que odian mazos de fichas',
    'cartas que detienen las fichas',
  ])('token hate (es): %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/tokens can't|exile all tokens|destroy all tokens/);
  });

  it.each([
    'cartas que castigan ganancia de vida',
    'cartas que odian ganar vida',
    'cartas que paran la vida',
  ])('lifegain hate (es): %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/can't gain life|lose life instead|gains life/);
  });

  it.each([
    'cartas que castigan control',
    'cartas que odian contrahechizos',
    'cartas que detienen contramagia',
  ])('control/counterspell hate (es): %s', (input) => {
    const q = buildClientFallbackQuery(input);
    expect(q).toMatch(/can't be countered|opponent.*counters|hatebear/);
  });

  it('does not collapse "cartas que castigan mazos de tesoros" to naive slang', () => {
    const q = buildClientFallbackQuery('cartas que castigan mazos de tesoros');
    expect(q).not.toMatch(/^o:"tesoro"$/i);
    expect(q).toContain('otag:artifact-removal');
  });
});
