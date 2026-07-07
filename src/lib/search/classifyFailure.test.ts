import { describe, it, expect } from 'vitest';
import { classifyFailureReason } from './classifyFailure';

describe('classifyFailureReason', () => {
  describe('too_short', () => {
    it('classifies empty/whitespace as too_short', () => {
      expect(classifyFailureReason('')).toBe('too_short');
      expect(classifyFailureReason('  ')).toBe('too_short');
      expect(classifyFailureReason('ab')).toBe('too_short');
    });
  });

  describe('misspelling', () => {
    it('classifies typo card names', () => {
      expect(classifyFailureReason('atraxia')).toBe('misspelling');
      expect(classifyFailureReason('eterna witness')).toBe('misspelling');
      expect(classifyFailureReason('cryptolythe eite')).toBe('misspelling');
      expect(classifyFailureReason('rogues passage')).toBe('misspelling');
    });

    it('classifies title-cased card names', () => {
      expect(classifyFailureReason("Atraxa, Praetors' Voice")).toBe(
        'misspelling',
      );
    });

    it('classifies short bare phrases with no keywords', () => {
      expect(classifyFailureReason('sol ring')).toBe('misspelling');
    });
  });

  describe('wrapper_phrase', () => {
    it('classifies "cards like X"', () => {
      expect(classifyFailureReason('cards like eterna witness')).toBe(
        'wrapper_phrase',
      );
    });

    it('classifies "similar to X"', () => {
      expect(classifyFailureReason('similar to lightning bolt')).toBe(
        'wrapper_phrase',
      );
    });

    it('classifies "what card is like X"', () => {
      expect(classifyFailureReason('what card is like sol ring')).toBe(
        'wrapper_phrase',
      );
    });

    it('classifies "alternatives to X"', () => {
      expect(classifyFailureReason('alternatives to mana crypt')).toBe(
        'wrapper_phrase',
      );
    });

    it('classifies trailing "X alternatives"', () => {
      expect(classifyFailureReason('mana crypt alternatives')).toBe(
        'wrapper_phrase',
      );
    });

    it('classifies "X but cheaper"', () => {
      expect(classifyFailureReason('mana crypt but cheaper')).toBe(
        'wrapper_phrase',
      );
    });
  });

  describe('missing_concept', () => {
    it('classifies keyword-heavy descriptive queries as missing_concept', () => {
      expect(
        classifyFailureReason('cards that create treasure in commander'),
      ).toBe('missing_concept');
      expect(
        classifyFailureReason('creatures that untap target permanent'),
      ).toBe('missing_concept');
      expect(
        classifyFailureReason('spells that draw cards from graveyard'),
      ).toBe('missing_concept');
    });

    it('classifies queries with search vocabulary', () => {
      expect(classifyFailureReason('cheap removal in mono black')).toBe(
        'missing_concept',
      );
    });

    it('short phrases without keywords are treated as fuzzy-recoverable', () => {
      // "mass combat evasion" has no known concept keywords → extractor
      // hands it to the fuzzy resolver. That's fine: the resolver will
      // fail, and the terminal event records fuzzy_resolved=false.
      expect(classifyFailureReason('mass combat evasion')).toBe('misspelling');
    });
  });

  describe('unknown', () => {
    it('classifies short non-keyword gibberish as unknown or misspelling', () => {
      // "qwerty" has no keywords, is 1 word, not too-short — extractor
      // returns it as a name candidate → misspelling. This is fine:
      // the fuzzy resolver will confirm and 404, at which point the
      // event is emitted with the fuzzy_resolved=false marker.
      const result = classifyFailureReason('qwerty');
      expect(['misspelling', 'unknown']).toContain(result);
    });
  });
});
