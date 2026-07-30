/**
 * Security Configuration Synchronization Tests
 *
 * Tests that ensure security-related configuration values are synchronized
 * between frontend and edge function code to prevent drift.
 */

import { describe, it, expect } from 'vitest';
import { SECURITY_LIMITS } from './index';

// Import edge function config values
// Note: These are duplicated here since edge function imports don't work in Vitest
// This test ensures they stay in sync
const EDGE_FUNCTION_CONFIG = {
  MAX_INPUT_QUERY_LENGTH: 500,
  RATE_LIMIT_PER_IP: 30,
  RATE_LIMIT_GLOBAL: 1000,
  RATE_LIMIT_WINDOW_MS: 60000,
  MAX_JSON_DEPTH: 10,
} as const;

describe('Security Configuration Synchronization', () => {
  describe('Query Length Limits', () => {
    it('frontend MAX_QUERY_LENGTH matches edge function MAX_INPUT_QUERY_LENGTH', () => {
      expect(SECURITY_LIMITS.MAX_QUERY_LENGTH).toBe(
        EDGE_FUNCTION_CONFIG.MAX_INPUT_QUERY_LENGTH,
      );
    });

    it('query length limit is at least 100 characters', () => {
      expect(SECURITY_LIMITS.MAX_QUERY_LENGTH).toBeGreaterThanOrEqual(100);
    });

    it('query length limit is at most 1000 characters', () => {
      expect(SECURITY_LIMITS.MAX_QUERY_LENGTH).toBeLessThanOrEqual(1000);
    });
  });

  describe('Rate Limit Synchronization', () => {
    it('IP rate limit matches between frontend and edge function', () => {
      expect(SECURITY_LIMITS.IP_RATE_LIMIT).toBe(
        EDGE_FUNCTION_CONFIG.RATE_LIMIT_PER_IP,
      );
    });

    it('global rate limit matches between frontend and edge function', () => {
      expect(SECURITY_LIMITS.GLOBAL_RATE_LIMIT).toBe(
        EDGE_FUNCTION_CONFIG.RATE_LIMIT_GLOBAL,
      );
    });

    it('rate limit window matches between frontend and edge function', () => {
      expect(SECURITY_LIMITS.RATE_LIMIT_WINDOW_MS).toBe(
        EDGE_FUNCTION_CONFIG.RATE_LIMIT_WINDOW_MS,
      );
    });

    it('IP rate limit is at least 10 requests per window', () => {
      expect(SECURITY_LIMITS.IP_RATE_LIMIT).toBeGreaterThanOrEqual(10);
    });

    it('global rate limit is greater than IP rate limit', () => {
      expect(SECURITY_LIMITS.GLOBAL_RATE_LIMIT).toBeGreaterThan(
        SECURITY_LIMITS.IP_RATE_LIMIT,
      );
    });
  });

  describe('Security Limit Reasonableness', () => {
    it('MAX_PARAMS is reasonable for Scryfall queries', () => {
      // Scryfall queries rarely need more than 10-15 parameters
      expect(SECURITY_LIMITS.MAX_PARAMS).toBeGreaterThanOrEqual(10);
      expect(SECURITY_LIMITS.MAX_PARAMS).toBeLessThanOrEqual(30);
    });

    it('session rate limit is less than or equal to IP rate limit', () => {
      expect(SECURITY_LIMITS.SESSION_RATE_LIMIT).toBeLessThanOrEqual(
        SECURITY_LIMITS.IP_RATE_LIMIT,
      );
    });

    it('rate limit window is at least 30 seconds', () => {
      expect(SECURITY_LIMITS.RATE_LIMIT_WINDOW_MS).toBeGreaterThanOrEqual(30000);
    });

    it('rate limit window is at most 5 minutes', () => {
      expect(SECURITY_LIMITS.RATE_LIMIT_WINDOW_MS).toBeLessThanOrEqual(300000);
    });

    it('MAX_JSON_DEPTH prevents deeply nested payloads', () => {
      expect(SECURITY_LIMITS.MAX_JSON_DEPTH).toBeGreaterThanOrEqual(5);
      expect(SECURITY_LIMITS.MAX_JSON_DEPTH).toBeLessThanOrEqual(20);
    });

    it('MIN_ALPHANUMERIC_RATIO catches spam queries', () => {
      expect(SECURITY_LIMITS.MIN_ALPHANUMERIC_RATIO).toBeGreaterThanOrEqual(0.3);
      expect(SECURITY_LIMITS.MIN_ALPHANUMERIC_RATIO).toBeLessThanOrEqual(0.8);
    });

    it('MAX_REPEATED_CHARS prevents character spam', () => {
      expect(SECURITY_LIMITS.MAX_REPEATED_CHARS).toBeGreaterThanOrEqual(3);
      expect(SECURITY_LIMITS.MAX_REPEATED_CHARS).toBeLessThanOrEqual(10);
    });
  });

  describe('Configuration Immutability', () => {
    it('SECURITY_LIMITS object is frozen', () => {
      expect(Object.isFrozen(SECURITY_LIMITS)).toBe(true);
    });

    it('cannot modify SECURITY_LIMITS values', () => {
      expect(() => {
        (SECURITY_LIMITS as { MAX_QUERY_LENGTH: number }).MAX_QUERY_LENGTH = 9999;
      }).toThrow();
    });

    it('cannot add new properties to SECURITY_LIMITS', () => {
      expect(() => {
        (SECURITY_LIMITS as Record<string, number>).NEW_LIMIT = 100;
      }).toThrow();
    });
  });

  describe('Documentation Alignment', () => {
    it('all expected security limits are defined', () => {
      const expectedLimits = [
        'MAX_QUERY_LENGTH',
        'MAX_PARAMS',
        'IP_RATE_LIMIT',
        'SESSION_RATE_LIMIT',
        'GLOBAL_RATE_LIMIT',
        'RATE_LIMIT_WINDOW_MS',
        'MAX_JSON_DEPTH',
        'MIN_ALPHANUMERIC_RATIO',
        'MAX_REPEATED_CHARS',
      ];

      for (const limit of expectedLimits) {
        expect(SECURITY_LIMITS).toHaveProperty(limit);
        expect(typeof (SECURITY_LIMITS as Record<string, unknown>)[limit]).toBe('number');
      }
    });

    it('no unexpected properties in SECURITY_LIMITS', () => {
      const allowedProperties = new Set([
        'MAX_QUERY_LENGTH',
        'MAX_PARAMS',
        'IP_RATE_LIMIT',
        'SESSION_RATE_LIMIT',
        'GLOBAL_RATE_LIMIT',
        'RATE_LIMIT_WINDOW_MS',
        'MAX_JSON_DEPTH',
        'MIN_ALPHANUMERIC_RATIO',
        'MAX_REPEATED_CHARS',
      ]);

      const actualProperties = Object.keys(SECURITY_LIMITS);

      for (const prop of actualProperties) {
        expect(allowedProperties.has(prop)).toBe(true);
      }
    });
  });
});
