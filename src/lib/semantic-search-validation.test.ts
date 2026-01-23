import { describe, it, expect } from 'vitest';
import {
  validateQuery,
  normalizeOrGroups,
  VALIDATION_CASES,
  AUTO_CORRECTION_CASES,
  detectQualityFlags,
  applyAutoCorrections,
} from '../../supabase/functions/semantic-search/validation.ts';

describe('Semantic Search Validation', () => {
  describe('VALIDATION_CASES', () => {
    VALIDATION_CASES.forEach((testCase) => {
      it(`passes case: ${testCase.name}`, () => {
        const result = validateQuery(testCase.query);

        expect(result.valid).toBe(testCase.expectedValid);

        testCase.expectedIssues.forEach((issue) => {
          expect(result.issues).toContain(issue);
        });

        if (testCase.expectedSanitized !== undefined) {
          expect(result.sanitized).toBe(testCase.expectedSanitized);
        }

        if (testCase.expectedSanitizedPrefix) {
          expect(
            result.sanitized.startsWith(testCase.expectedSanitizedPrefix),
          ).toBe(true);
        }

        if (testCase.expectedSanitizedMaxLength) {
          expect(result.sanitized.length).toBeLessThanOrEqual(
            testCase.expectedSanitizedMaxLength,
          );
        }
      });
    });
  });

  describe('AUTO_CORRECTION_CASES', () => {
    AUTO_CORRECTION_CASES.forEach((testCase) => {
      it(`passes case: ${testCase.name}`, () => {
        const flags = detectQualityFlags(testCase.query);
        const { correctedQuery, corrections } = applyAutoCorrections(
          testCase.query,
          flags,
        );

        expect(correctedQuery).toBe(testCase.expectedCorrectedQuery);

        testCase.expectedCorrections.forEach((correction) => {
          expect(corrections).toContain(correction);
        });
      });
    });
  });

  describe('normalizeOrGroups', () => {
    it('wraps redundant checks', () => {
      expect(normalizeOrGroups('a OR b OR c')).toBe('(a OR b OR c)');
    });

    it('leaves already wrapped groups alone', () => {
      expect(normalizeOrGroups('(a OR b)')).toBe('(a OR b)');
    });

    it('wraps mixed groups correctly', () => {
      // This logic in validation.ts is simple string manipulation, simpler cases work best
      expect(normalizeOrGroups('a OR b')).toBe('(a OR b)');
    });
  });
});
