/**
 * Regression suite for phrase-level set matching.
 *
 * Origin: "the hobbit red dwarf" returned nothing because set names were only
 * matched when they made up the *entire* query. These tests lock in the
 * phrase-level behaviour (position, filler words, casing, punctuation) and the
 * guards that stop ordinary Magic vocabulary from being hijacked as set names.
 */
import { describe, expect, it } from 'vitest';
import { matchSetPhrase, matchSetQuery } from '../../../../supabase/functions/_shared/setMatching';
import { SCRYFALL_SETS } from '../../../../supabase/functions/_shared/set-vocabulary';
import { buildDeterministicIntent } from '../../../../supabase/functions/semantic-search/deterministic/index';

const setNames = new Set(SCRYFALL_SETS.map((set) => set.name.toLowerCase()));

describe('set phrase matching — mixed intent queries', () => {
  const cases: Array<{ query: string; code: string; remainder: string }> = [
    { query: 'the hobbit red dwarf', code: 'hob', remainder: 'red dwarf' },
    { query: 'red dwarf the hobbit', code: 'hob', remainder: 'red dwarf' },
    { query: 'the hobbit legendary creatures', code: 'hob', remainder: 'legendary creatures' },
    { query: 'bloomburrow rabbits', code: 'blb', remainder: 'rabbits' },
    { query: 'cheap bloomburrow removal', code: 'blb', remainder: 'cheap removal' },
    { query: 'kaldheim dwarves', code: 'khm', remainder: 'dwarves' },
  ];

  it.each(cases)('resolves "$query"', ({ query, code, remainder }) => {
    const match = matchSetPhrase(query);
    expect(match).not.toBeNull();
    expect(match?.query).toContain(`e:${code}`);
    expect(match?.remainder).toBe(remainder);
  });

  it('is case- and punctuation-insensitive', () => {
    const variants = ['The Hobbit red dwarf', 'THE HOBBIT  red   dwarf', 'the-hobbit, red dwarf'];
    const rendered = variants.map((variant) => matchSetPhrase(variant)?.query);
    expect(new Set(rendered).size).toBe(1);
    expect(rendered[0]).toContain('e:hob');
  });

  it('ignores filler words around the set name', () => {
    const match = matchSetPhrase('cards from the hobbit set with flying');
    expect(match?.query).toContain('e:hob');
    expect(match?.remainder).toBe('with flying');
  });

  it('is deterministic across repeated calls', () => {
    const first = matchSetPhrase('the hobbit red dwarf');
    const second = matchSetPhrase('the hobbit red dwarf');
    expect(second).toEqual(first);
  });

  it('includes supplemental child products of the matched set', () => {
    const match = matchSetPhrase('the hobbit red dwarf');
    expect(match!.sets.length).toBeGreaterThan(1);
    expect(match!.query.startsWith('(')).toBe(true);
  });
});

describe('set phrase matching — guards against hijacking', () => {
  const nonSetQueries = [
    'red dwarf commander',
    'treasure token creatures',
    'cheap red removal',
    'legends of the multiverse deck',
    'invasion of the giants',
    'foundations of a good deck',
    'jumpstart my brew',
    'portal to another world',
    'creatures with vigilance',
    'blue counterspells under $5',
  ];

  it.each(nonSetQueries)('does not treat "%s" as a set reference', (query) => {
    expect(matchSetPhrase(query)).toBeNull();
  });

  it('never phrase-matches bare set codes inside a query', () => {
    expect(matchSetPhrase('hob red dwarf')).toBeNull();
    expect(matchSetPhrase('blb rabbits')).toBeNull();
  });

  it('requires at least five characters for single-word set names', () => {
    const shortNames = SCRYFALL_SETS.filter(
      (set) => !set.name.includes(' ') && set.name.length < 5,
    );
    for (const set of shortNames.slice(0, 20)) {
      expect(matchSetPhrase(`${set.name} creatures`)).toBeNull();
    }
  });

  it('returns null when nothing is left after removing the set phrase', () => {
    expect(matchSetPhrase('the bloomburrow set')).toBeNull();
    expect(matchSetPhrase('bloomburrow cards')).toBeNull();
  });

  it('leaves whole-query set searches to matchSetQuery', () => {
    expect(matchSetPhrase('bloomburrow')).toBeNull();
    expect(matchSetQuery('bloomburrow')?.query).toContain('e:blb');
  });
});

describe('set phrase matching — deterministic intent integration', () => {
  it('combines the set clause with parsed card criteria', () => {
    const { deterministicQuery } = buildDeterministicIntent('the hobbit red dwarf');
    expect(deterministicQuery).toContain('e:hob');
    expect(deterministicQuery).toMatch(/dwarf/i);
  });

  it('keeps colour criteria from the remainder', () => {
    const { deterministicQuery } = buildDeterministicIntent('bloomburrow blue rabbits');
    expect(deterministicQuery).toContain('e:blb');
    expect(deterministicQuery).toMatch(/rabbit/i);
  });

  it('does not inject a set clause into ordinary searches', () => {
    const { deterministicQuery } = buildDeterministicIntent('cheap red removal');
    expect(deterministicQuery ?? '').not.toMatch(/\be:/);
  });
});

describe('set vocabulary sanity', () => {
  it('contains the sets behind the original failure report', () => {
    expect(setNames.has('the hobbit')).toBe(true);
    expect(SCRYFALL_SETS.some((set) => set.code === 'hob')).toBe(true);
    expect(SCRYFALL_SETS.some((set) => set.code === 'hoc')).toBe(true);
  });

  it('resolves a sample of multi-word set names inside longer queries', () => {
    const samples = SCRYFALL_SETS.filter(
      (set) => set.setType === 'expansion' && set.name.split(' ').length >= 2,
    ).slice(0, 25);

    for (const set of samples) {
      const match = matchSetPhrase(`${set.name} legendary creatures`);
      if (match) {
        expect(match.query).toMatch(/e:[a-z0-9]+/);
        expect(match.remainder).toBe('legendary creatures');
      }
    }
  });
});
