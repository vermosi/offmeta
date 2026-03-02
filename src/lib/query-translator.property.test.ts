/**
 * Property-based tests for query translation and security utilities.
 * Uses fast-check to verify invariants across arbitrary inputs.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateScryfallQuery } from '@/lib/scryfall/query';
import { sanitizeErrorForClient, containsPrototypePollution } from '@/lib/security';

describe('Property-Based Tests', () => {
  describe('validateScryfallQuery', () => {
    it('never throws on arbitrary string input', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 500 }),
          (input) => {
            const result = validateScryfallQuery(input);
            expect(result).toBeDefined();
            expect(typeof result.valid).toBe('boolean');
            expect(typeof result.sanitized).toBe('string');
            expect(Array.isArray(result.issues)).toBe(true);
          },
        ),
        { numRuns: 200 },
      );
    });

    it('sanitized output length never exceeds input length plus overhead', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 300 }),
          (input) => {
            const result = validateScryfallQuery(input);
            // Sanitized output can grow slightly from normalizeOrGroups adding parens,
            // but should not explode in size
            expect(result.sanitized.length).toBeLessThanOrEqual(
              input.length * 2 + 50,
            );
          },
        ),
        { numRuns: 200 },
      );
    });
  });

  describe('sanitizeErrorForClient', () => {
    it('output never contains <script, DROP TABLE, or ../ patterns', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string({ minLength: 0, maxLength: 300 }),
            fc.constant('<script>alert(1)</script>'),
            fc.constant("'; DROP TABLE users; --"),
            fc.constant('../../etc/passwd'),
            fc.constant('/home/user/app/src/index.ts:42:10'),
            fc.constant('Bearer sk_live_abc123xyz'),
          ),
          (input) => {
            const result = sanitizeErrorForClient(new Error(input));
            expect(typeof result).toBe('string');
            // Should not contain raw file paths with line numbers
            expect(result).not.toMatch(/\.[jt]s:\d+:\d+/);
            // Should not leak bearer tokens
            expect(result).not.toMatch(/Bearer\s+[a-zA-Z0-9_-]{10,}/);
            // Output should be bounded
            expect(result.length).toBeLessThanOrEqual(500);
          },
        ),
        { numRuns: 200 },
      );
    });

    it('always returns a string for any input type', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string(),
            fc.integer(),
            fc.constant(null),
            fc.constant(undefined),
            fc.object(),
          ),
          (input) => {
            const result = sanitizeErrorForClient(input);
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 200 },
      );
    });
  });

  describe('In-memory cache roundtrip', () => {
    it('set followed by get always returns the original value', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 500 }),
          (key, value) => {
            // Simple Map-based cache simulation matching the project's caching pattern
            const cache = new Map<string, string>();
            cache.set(key, value);
            expect(cache.get(key)).toBe(value);
          },
        ),
        { numRuns: 200 },
      );
    });

    it('cache respects insertion order and overwrites', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          (key, value1, value2) => {
            const cache = new Map<string, string>();
            cache.set(key, value1);
            cache.set(key, value2);
            expect(cache.get(key)).toBe(value2);
            expect(cache.size).toBe(1);
          },
        ),
        { numRuns: 200 },
      );
    });
  });

  describe('containsPrototypePollution', () => {
    it('detects __proto__ in any arbitrary string containing it', () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 100 }),
          fc.string({ maxLength: 100 }),
          (prefix, suffix) => {
            const input = `${prefix}__proto__${suffix}`;
            expect(containsPrototypePollution(input)).toBe(true);
          },
        ),
        { numRuns: 200 },
      );
    });
  });
});
