import { describe, it, expect } from 'vitest';
import { extractCardNameCandidate } from './fallback';

describe('extractCardNameCandidate', () => {
  describe('bare card names (typos allowed)', () => {
    it('returns typo-ed single word as-is (e.g. "atraxia")', () => {
      expect(extractCardNameCandidate('atraxia')).toBe('atraxia');
    });

    it('returns short lowercase multi-word bare names', () => {
      expect(extractCardNameCandidate('sol ring')).toBe('sol ring');
      expect(extractCardNameCandidate('dark ritual')).toBe('dark ritual');
    });

    it('returns title-cased bare names', () => {
      expect(extractCardNameCandidate("Atraxa, Praetors' Voice")).toBe(
        "Atraxa, Praetors' Voice",
      );
    });

    it('returns possessive-form names', () => {
      expect(extractCardNameCandidate("mirris guile")).toBe('mirris guile');
    });
  });

  describe('"cards like X" / "similar to X" wrappers', () => {
    it('strips "cards like X"', () => {
      expect(extractCardNameCandidate('cards like eterna witness')).toBe(
        'eterna witness',
      );
    });

    it('strips "card like X"', () => {
      expect(extractCardNameCandidate('card like sol ring')).toBe('sol ring');
    });

    it('strips "cards similar to X"', () => {
      expect(extractCardNameCandidate('cards similar to snapcaster mage')).toBe(
        'snapcaster mage',
      );
    });

    it('strips "similar to X"', () => {
      expect(extractCardNameCandidate('similar to lightning bolt')).toBe(
        'lightning bolt',
      );
    });

    it('strips "similar cards to X"', () => {
      expect(extractCardNameCandidate('similar cards to bolt')).toBe('bolt');
    });

    it('strips "cards that are similar to X"', () => {
      expect(
        extractCardNameCandidate('cards that are similar to path to exile'),
      ).toBe('path to exile');
    });
  });

  describe('"alternatives" wrappers', () => {
    it('strips "cheap alternatives to X"', () => {
      expect(extractCardNameCandidate('cheap alternatives to force of will')).toBe(
        'force of will',
      );
    });

    it('strips "budget alternative to X"', () => {
      expect(extractCardNameCandidate('budget alternative to mana crypt')).toBe(
        'mana crypt',
      );
    });

    it('strips "alternatives to X"', () => {
      expect(extractCardNameCandidate('alternatives to sol ring')).toBe(
        'sol ring',
      );
    });

    it('strips trailing "X alternatives"', () => {
      expect(extractCardNameCandidate('mana crypt alternatives')).toBe(
        'mana crypt',
      );
    });

    it('strips trailing "X alternative"', () => {
      expect(extractCardNameCandidate('sol ring alternative')).toBe('sol ring');
    });

    it('strips "X but cheaper"', () => {
      expect(extractCardNameCandidate('mana crypt but cheaper')).toBe(
        'mana crypt',
      );
    });
  });

  describe('rejects descriptive/keyword queries', () => {
    it('returns null for empty input', () => {
      expect(extractCardNameCandidate('')).toBeNull();
      expect(extractCardNameCandidate('   ')).toBeNull();
    });

    it('returns null for search-keyword phrases', () => {
      expect(
        extractCardNameCandidate('creatures that produce treasure'),
      ).toBeNull();
      expect(extractCardNameCandidate('cheap red spells')).toBeNull();
      expect(
        extractCardNameCandidate('cards that create tokens in commander'),
      ).toBeNull();
    });

    it('returns null for long descriptive queries', () => {
      expect(
        extractCardNameCandidate(
          'creatures with flying that cost less than three mana in blue',
        ),
      ).toBeNull();
    });
  });

  describe('regression: dominant zero-result failures', () => {
    // These are the real-world queries the fuzzy recovery flow should catch.
    it.each([
      ['atraxia', 'atraxia'],
      ['cryptolythe eite', 'cryptolythe eite'],
      ['rogues passage', 'rogues passage'],
      ['eterna witness', 'eterna witness'],
      ['cards like eterna witness', 'eterna witness'],
    ])('extracts a candidate from %s', (input, expected) => {
      expect(extractCardNameCandidate(input)).toBe(expected);
    });
  });
});
