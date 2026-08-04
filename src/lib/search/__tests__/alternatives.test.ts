import { describe, expect, it } from 'vitest';

import { detectAlternativesIntent } from '../alternatives';

describe('detectAlternativesIntent', () => {
  it('detects budget alternatives phrasing', () => {
    expect(detectAlternativesIntent('budget alternatives to rhystic study')).toEqual({
      cardName: 'rhystic study',
      budget: true,
      kind: 'alternatives_to',
    });
  });

  it('detects non-budget similarity phrasing', () => {
    expect(detectAlternativesIntent('cards similar to smothering tithe')).toEqual({
      cardName: 'smothering tithe',
      budget: false,
      kind: 'similar_to',
    });
  });

  it('strips format qualifiers', () => {
    expect(detectAlternativesIntent('replacements for mana crypt in commander')).toEqual({
      cardName: 'mana crypt',
      budget: false,
      kind: 'alternatives_to',
    });
  });

  it('detects "X but cheaper"', () => {
    expect(detectAlternativesIntent('cyclonic rift but cheaper')).toEqual({
      cardName: 'cyclonic rift',
      budget: true,
      kind: 'but_cheaper',
    });
  });

  it('ignores ordinary keyword searches', () => {
    expect(detectAlternativesIntent('cheap red treasure cards')).toBeNull();
    expect(detectAlternativesIntent('creatures that make treasure')).toBeNull();
  });

  it('ignores raw Scryfall syntax', () => {
    expect(detectAlternativesIntent('cards like o:"draw a card"')).toBeNull();
  });
});
