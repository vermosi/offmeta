/**
 * Regression coverage for the edge deterministic parser's "alternatives to X"
 * handling. Lives under src/ because vitest only collects tests there.
 */
import { describe, expect, it } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { parseCardsLike } from '../../../../supabase/functions/semantic-search/deterministic/parse-mappings.ts';

interface TestIR {
  types: string[];
  subtypes: string[];
  excludedTypes: string[];
  numeric: string[];
  tags: string[];
  artTags: string[];
  oracle: string[];
  specials: string[];
  warnings: string[];
  remaining: string;
}

function emptyIR(): TestIR {
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
  };
}

const parse = parseCardsLike as unknown as (q: string, ir: TestIR) => string;

describe('edge parseCardsLike — "alternatives to X"', () => {
  it('resolves the card after "to" instead of leaving loose text', () => {
    const ir = emptyIR();
    const remaining = parse('budget alternatives to rhystic study', ir);

    expect(remaining).not.toContain('to rhystic study');
    expect(ir.specials.length).toBeGreaterThan(0);
  });

  it('keeps an unmapped card name in the remaining text', () => {
    const ir = emptyIR();
    expect(parse('cheap replacements for smothering tithe', ir)).toBe(
      'smothering tithe',
    );
  });

  it('still handles the trailing "X alternatives" form', () => {
    const ir = emptyIR();
    parse('sol ring alternatives', ir);
    expect(ir.specials.length).toBeGreaterThan(0);
  });

  it('handles format qualifiers after the card name', () => {
    const ir = emptyIR();
    const remaining = parse('alternatives to cyclonic rift in commander', ir);
    expect(remaining).not.toContain('to cyclonic rift');
    expect(ir.specials.length).toBeGreaterThan(0);
  });
});
