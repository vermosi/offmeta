import { describe, it, expect } from 'vitest';
import {
  buildRephraseSuggestions,
  isExactNameFallback,
  guessReferenceCard,
} from '../rephraseSuggestions';

describe('rephraseSuggestions', () => {
  it('detects the terminal exact-name fallback', () => {
    expect(isExactNameFallback('!"budget alternatives to rhystic study"')).toBe(
      true,
    );
    expect(isExactNameFallback('o:treasure t:creature')).toBe(false);
    expect(isExactNameFallback(undefined)).toBe(false);
  });

  it('recovers the reference card from a wrapper phrase', () => {
    expect(guessReferenceCard('budget alternatives to rhystic study')).toBe(
      'rhystic study',
    );
    expect(guessReferenceCard('cards like eternal witness in commander')).toBe(
      'eternal witness',
    );
  });

  it('suggests alternatives rephrasings for the failing query', () => {
    const out = buildRephraseSuggestions(
      '!"budget alternatives to rhystic study"',
      'budget alternatives to rhystic study',
    );
    expect(out.map((s) => s.query)).toEqual([
      'cards like rhystic study',
      'rhystic study',
    ]);
  });

  it('returns nothing for a normal query', () => {
    expect(buildRephraseSuggestions('o:treasure', 'treasure cards')).toEqual([]);
  });

  it('returns nothing when the remainder is a sentence', () => {
    const long = 'cards that punish opponents for playing too many treasures';
    expect(buildRephraseSuggestions(`!"${long}"`, long)).toEqual([]);
  });
});
