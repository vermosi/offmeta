import { describe, expect, it } from 'vitest';

import { parseCardsLike } from './parse-mappings.ts';
import type { SearchIR } from './types.ts';

function emptyIR(): SearchIR {
  return {
    types: [],
    subtypes: [],
    excludedTypes: [],
    numeric: [],
    tags: [],
    artTags: [],
    oracle: [],
    specials: [],
    warnings: [],
    remaining: '',
  } as SearchIR;
}

describe('parseCardsLike — "alternatives to X"', () => {
  it('resolves the card after "to" instead of leaving loose text', () => {
    const ir = emptyIR();
    const remaining = parseCardsLike('budget alternatives to rhystic study', ir);

    // Regression: this used to consume "budget alternatives" as the card name
    // and leave "to rhystic study" as the query.
    expect(remaining).not.toContain('to rhystic study');
    expect(ir.specials.length).toBeGreaterThan(0);
  });

  it('handles "replacements for X" with an unmapped card by keeping the name', () => {
    const ir = emptyIR();
    const remaining = parseCardsLike(
      'cheap replacements for smothering tithe',
      ir,
    );

    expect(remaining).toBe('smothering tithe');
  });

  it('still handles the trailing "X alternatives" form', () => {
    const ir = emptyIR();
    parseCardsLike('sol ring alternatives', ir);

    expect(ir.specials.length).toBeGreaterThan(0);
  });

  it('handles format qualifiers after the card name', () => {
    const ir = emptyIR();
    const remaining = parseCardsLike(
      'alternatives to cyclonic rift in commander',
      ir,
    );

    expect(remaining).not.toContain('to cyclonic rift');
    expect(ir.specials.length).toBeGreaterThan(0);
  });
});
