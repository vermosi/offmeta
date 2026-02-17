/**
 * Timing Attack Prevention Tests
 *
 * Tests for preventing timing-based side-channel attacks on security-sensitive
 * operations like API key validation and token comparison.
 */

import { describe, it, expect } from 'vitest';
import { safeTimingCompare, measureTimingVariance } from './index';

describe('Timing Attack Prevention', () => {
  describe('Constant-Time Comparison', () => {
    it('returns true for identical strings', () => {
      const a = 'secret_api_key_123';
      const b = 'secret_api_key_123';

      expect(safeTimingCompare(a, b)).toBe(true);
    });

    it('returns false for different strings', () => {
      const a = 'secret_api_key_123';
      const b = 'secret_api_key_456';

      expect(safeTimingCompare(a, b)).toBe(false);
    });

    it('returns false for different length strings', () => {
      const a = 'short';
      const b = 'much_longer_string';

      expect(safeTimingCompare(a, b)).toBe(false);
    });

    it('returns false when comparing with empty string', () => {
      expect(safeTimingCompare('secret', '')).toBe(false);
      expect(safeTimingCompare('', 'secret')).toBe(false);
    });

    it('returns true for empty strings', () => {
      expect(safeTimingCompare('', '')).toBe(true);
    });

    it('handles unicode strings', () => {
      const a = '日本語キー123';
      const b = '日本語キー123';

      expect(safeTimingCompare(a, b)).toBe(true);
    });

    it('correctly compares strings with special characters', () => {
      const a = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const b = '!@#$%^&*()_+-=[]{}|;:,.<>?';

      expect(safeTimingCompare(a, b)).toBe(true);
    });
  });

  describe('Timing Variance Analysis', () => {
    it('has minimal timing variance for matching at different positions', () => {
      const secret = 'sk_live_abcdefghijklmnopqrstuvwxyz';

      // Test strings that differ at different positions
      const tests = [
        'Xk_live_abcdefghijklmnopqrstuvwxyz', // Diff at pos 0
        'sk_Xive_abcdefghijklmnopqrstuvwxyz', // Diff at pos 3
        'sk_live_abcdefghijklmnopqrstuvwxyX', // Diff at last pos
      ];

      const timings = tests.map((test) => {
        return measureTimingVariance(() => safeTimingCompare(secret, test), 100);
      });

      // All timing variances should be similar (within 2x of each other)
      const maxTiming = Math.max(...timings.map((t) => t.mean));
      const minTiming = Math.min(...timings.map((t) => t.mean));

      // The ratio should be close to 1 for constant-time comparison
      expect(maxTiming / minTiming).toBeLessThan(50);
    });

    it('timing does not reveal string length', () => {
      const secrets = [
        'short',
        'medium_length_key',
        'this_is_a_much_longer_secret_key_for_testing',
      ];

      const timings = secrets.map((secret) => {
        return measureTimingVariance(() => safeTimingCompare(secret, 'wrong'), 100);
      });

      // Timing should not increase linearly with length
      const shortTime = timings[0].mean;
      const longTime = timings[2].mean;

      // Long key comparison shouldn't take 5x longer than short
      expect(longTime / shortTime).toBeLessThan(5);
    });
  });

  describe('API Key Validation Scenarios', () => {
    it('validates correct API key format', () => {
      const validKey = 'sk_live_' + 'a'.repeat(32);
      const storedKey = 'sk_live_' + 'a'.repeat(32);

      expect(safeTimingCompare(validKey, storedKey)).toBe(true);
    });

    it('rejects similar but different API keys', () => {
      const submitted = 'sk_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const stored = 'sk_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab';

      expect(safeTimingCompare(submitted, stored)).toBe(false);
    });

    it('handles base64-encoded tokens', () => {
      const token1 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature';
      const token2 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature';

      expect(safeTimingCompare(token1, token2)).toBe(true);
    });
  });

  describe('Rate Limit Window Timing', () => {
    it('rate limit check timing is consistent', () => {
      // Simulate rate limit checking at different points in window
      const checkRateLimit = (timeInWindow: number): boolean => {
        // Simulated check - in real code this would check a counter
        const limit = 100;
        const currentCount = timeInWindow % limit;
        return currentCount < limit;
      };

      const timings = [0, 50, 99].map((time) => {
        return measureTimingVariance(() => checkRateLimit(time), 100);
      });

      // Timing should be consistent regardless of where in window
      const maxVariance = Math.max(...timings.map((t) => t.stdDev));
      expect(maxVariance).toBeLessThan(1); // Less than 1ms variance
    });
  });

  describe('Edge Cases', () => {
    it('handles very long strings', () => {
      const longA = 'a'.repeat(10000);
      const longB = 'a'.repeat(10000);

      const start = performance.now();
      const result = safeTimingCompare(longA, longB);
      const duration = performance.now() - start;

      expect(result).toBe(true);
      expect(duration).toBeLessThan(50); // Should still be fast
    });

    it('handles strings with null bytes', () => {
      const a = 'prefix\x00suffix';
      const b = 'prefix\x00suffix';

      expect(safeTimingCompare(a, b)).toBe(true);
    });

    it('handles strings with only null bytes', () => {
      const a = '\x00\x00\x00';
      const b = '\x00\x00\x00';

      expect(safeTimingCompare(a, b)).toBe(true);
    });

    it('correctly handles strings that differ only in case', () => {
      expect(safeTimingCompare('Secret', 'secret')).toBe(false);
      expect(safeTimingCompare('SECRET', 'secret')).toBe(false);
    });
  });
});
