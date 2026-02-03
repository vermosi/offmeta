/**
 * Regular Expression Denial of Service (ReDoS) Prevention Tests
 *
 * Tests that ensure regex operations complete within acceptable time limits
 * and don't cause catastrophic backtracking.
 */

import { describe, it, expect } from 'vitest';
import { testRegexPerformance, REDOS_PAYLOADS, isRegexSafe, sanitizeInput } from './index';

// Import the actual validation function to test
import { validateScryfallQuery } from '@/lib/scryfall/query';

describe('ReDoS Attack Prevention', () => {
  describe('Query Validation Performance', () => {
    it('handles long repetitive character strings quickly', () => {
      const maliciousInput = 'a'.repeat(10000);

      const { duration } = testRegexPerformance(() => {
        sanitizeInput(maliciousInput);
      });

      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });

    it('handles alternation bombs quickly', () => {
      // (a|a|a|a)+ patterns can cause backtracking
      const maliciousInput = 'a'.repeat(50) + 'X';

      const { duration } = testRegexPerformance(() => {
        sanitizeInput(maliciousInput);
      });

      expect(duration).toBeLessThan(100);
    });

    it('handles nested quantifier patterns safely', () => {
      // Patterns like (a+)+ can cause exponential backtracking
      const maliciousInput = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaab';

      const { duration } = testRegexPerformance(() => {
        sanitizeInput(maliciousInput);
      });

      expect(duration).toBeLessThan(100);
    });

    it('handles bracket expression with quantifiers', () => {
      // [a-z]+ type patterns with long input
      const maliciousInput = 'abcdefghij'.repeat(1000) + '!';

      const { duration } = testRegexPerformance(() => {
        validateScryfallQuery(maliciousInput);
      });

      expect(duration).toBeLessThan(100);
    });

    it('handles overlapping character classes', () => {
      // (\s|\S)+ matches everything and can backtrack
      const maliciousInput = ' a '.repeat(1000);

      const { duration } = testRegexPerformance(() => {
        sanitizeInput(maliciousInput);
      });

      expect(duration).toBeLessThan(100);
    });
  });

  describe('Known ReDoS Payloads', () => {
    it.each(REDOS_PAYLOADS)('handles ReDoS payload: %s', (payload) => {
      const { duration } = testRegexPerformance(() => {
        sanitizeInput(payload);
      });

      expect(duration).toBeLessThan(200); // Allow slightly more time for complex patterns
    });

    it('handles evil regex pattern: (a+)+$', () => {
      // This is a classic ReDoS pattern
      const input = 'a'.repeat(30) + '!';

      const { duration } = testRegexPerformance(() => {
        sanitizeInput(input);
      });

      expect(duration).toBeLessThan(100);
    });

    it('handles polynomial backtracking: (a|aa)+$', () => {
      const input = 'a'.repeat(50) + 'X';

      const { duration } = testRegexPerformance(() => {
        sanitizeInput(input);
      });

      expect(duration).toBeLessThan(100);
    });

    it('handles exponential backtracking: (a*)*$', () => {
      const input = 'a'.repeat(25);

      const { duration } = testRegexPerformance(() => {
        sanitizeInput(input);
      });

      expect(duration).toBeLessThan(100);
    });
  });

  describe('Regex Safety Analysis', () => {
    it('identifies safe regex patterns', () => {
      const safePatterns = [
        /^[a-z]+$/,
        /\d{4}-\d{2}-\d{2}/,
        /^(yes|no)$/i,
      ];

      for (const pattern of safePatterns) {
        expect(isRegexSafe(pattern)).toBe(true);
      }
    });

    it('identifies potentially dangerous nested quantifiers', () => {
      const dangerousPatterns = [
        /(a+)+$/,
        /([a-z]+)+$/,
        /(.*a){10}/,
      ];

      for (const pattern of dangerousPatterns) {
        expect(isRegexSafe(pattern)).toBe(false);
      }
    });

    it('identifies overlapping alternatives', () => {
      const overlappingPatterns = [
        /(a|a)+$/,
        /(ab|ab)+$/,
      ];

      for (const pattern of overlappingPatterns) {
        expect(isRegexSafe(pattern)).toBe(false);
      }
    });
  });

  describe('Validation Function Performance', () => {
    it('validateScryfallQuery completes quickly with pathological input', () => {
      const pathological = '('.repeat(50) + ')'.repeat(50);

      const { duration } = testRegexPerformance(() => {
        validateScryfallQuery(pathological);
      });

      expect(duration).toBeLessThan(100);
    });

    it('handles maximum length input efficiently', () => {
      const maxLengthInput = 't:' + 'a'.repeat(498); // 500 chars

      const { duration } = testRegexPerformance(() => {
        validateScryfallQuery(maxLengthInput);
      });

      expect(duration).toBeLessThan(100);
    });

    it('handles many operator patterns efficiently', () => {
      const manyOperators = Array.from({ length: 50 }, (_, i) => `key${i}:val${i}`).join(' ');

      const { duration } = testRegexPerformance(() => {
        sanitizeInput(manyOperators);
      });

      expect(duration).toBeLessThan(100);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty string quickly', () => {
      const { duration } = testRegexPerformance(() => {
        sanitizeInput('');
      });

      expect(duration).toBeLessThan(10);
    });

    it('handles single character quickly', () => {
      const { duration } = testRegexPerformance(() => {
        sanitizeInput('a');
      });

      expect(duration).toBeLessThan(10);
    });

    it('handles whitespace-only input quickly', () => {
      const { duration } = testRegexPerformance(() => {
        sanitizeInput('   '.repeat(1000));
      });

      expect(duration).toBeLessThan(50);
    });

    it('handles unicode input efficiently', () => {
      const unicodeInput = '日本語'.repeat(500);

      const { duration } = testRegexPerformance(() => {
        sanitizeInput(unicodeInput);
      });

      expect(duration).toBeLessThan(100);
    });
  });
});
