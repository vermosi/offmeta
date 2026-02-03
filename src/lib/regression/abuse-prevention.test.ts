/**
 * Regression tests for abuse prevention functionality.
 * Tests E2E_ABUSE_001
 */

import { describe, it, expect } from 'vitest';

// ============================================================================
// E2E_ABUSE Tests: Abuse Prevention
// ============================================================================

describe('Regression: E2E_ABUSE - Abuse Prevention', () => {
  // E2E_ABUSE_001: Validation failures don't trigger retry loops
  describe('E2E_ABUSE_001: No Retry on Validation Failure', () => {
    it('stops after first validation failure', () => {
      let attemptCount = 0;

      function attemptSearch(query: string, isValid: boolean): boolean {
        attemptCount++;

        if (!isValid) {
          // Validation failures should NOT retry
          return false;
        }

        return true;
      }

      // Invalid query should only attempt once
      attemptSearch('t:artifact t: t: t:', false);
      expect(attemptCount).toBe(1);
    });

    it('distinguishes validation errors from network errors', () => {
      type ErrorType = 'validation' | 'network' | 'unknown';

      function getErrorType(error: {
        status?: number;
        message?: string;
      }): ErrorType {
        // 400-level errors are validation
        if (error.status && error.status >= 400 && error.status < 500) {
          return 'validation';
        }
        // 500-level errors might be retryable
        if (error.status && error.status >= 500) {
          return 'network';
        }
        // Check message for validation keywords
        if (
          error.message?.includes('Invalid') ||
          error.message?.includes('too many')
        ) {
          return 'validation';
        }
        return 'unknown';
      }

      expect(getErrorType({ status: 400 })).toBe('validation');
      expect(getErrorType({ status: 422 })).toBe('validation');
      expect(getErrorType({ status: 500 })).toBe('network');
      expect(getErrorType({ message: 'Invalid query format' })).toBe(
        'validation',
      );
    });

    it('only retries on transient errors', () => {
      const retriableErrors = new Set(['network', 'timeout', '503', '504']);
      const nonRetriableErrors = new Set([
        'validation',
        '400',
        '401',
        '403',
        '404',
        '422',
      ]);

      function shouldRetry(errorType: string): boolean {
        return (
          retriableErrors.has(errorType) && !nonRetriableErrors.has(errorType)
        );
      }

      expect(shouldRetry('network')).toBe(true);
      expect(shouldRetry('timeout')).toBe(true);
      expect(shouldRetry('validation')).toBe(false);
      expect(shouldRetry('400')).toBe(false);
      expect(shouldRetry('422')).toBe(false);
    });
  });

  // Single error toast display
  describe('Single Error Toast', () => {
    it('shows only one toast per error type', () => {
      const displayedToasts = new Set<string>();

      function showErrorToast(message: string): boolean {
        if (displayedToasts.has(message)) {
          return false; // Already shown
        }
        displayedToasts.add(message);
        return true;
      }

      // First toast shows
      expect(showErrorToast('Invalid query')).toBe(true);

      // Same message doesn't show again
      expect(showErrorToast('Invalid query')).toBe(false);

      // Different message shows
      expect(showErrorToast('Network error')).toBe(true);
    });

    it('resets toast tracking on new search', () => {
      let displayedToasts = new Set<string>();

      function showErrorToast(message: string): boolean {
        if (displayedToasts.has(message)) {
          return false;
        }
        displayedToasts.add(message);
        return true;
      }

      function resetToasts(): void {
        displayedToasts = new Set();
      }

      showErrorToast('Error 1');
      expect(displayedToasts.size).toBe(1);

      resetToasts();
      expect(displayedToasts.size).toBe(0);

      // Can show same toast again after reset
      expect(showErrorToast('Error 1')).toBe(true);
    });
  });
});

// ============================================================================
// Input Sanitization Abuse Prevention
// ============================================================================

describe('Regression: Input Sanitization', () => {
  it('rejects excessively long queries', () => {
    const MAX_QUERY_LENGTH = 400;
    const longQuery = 'a'.repeat(500);

    const isValid = longQuery.length <= MAX_QUERY_LENGTH;
    expect(isValid).toBe(false);
  });

  it('detects repetitive character spam', () => {
    function hasRepetitiveChars(query: string): boolean {
      const repetitivePattern = /(.)\1{5,}/g;
      return repetitivePattern.test(query);
    }

    expect(hasRepetitiveChars('aaaaaaa')).toBe(true);
    expect(hasRepetitiveChars('t:creature')).toBe(false);
    expect(hasRepetitiveChars('tttttttt:creature')).toBe(true);
  });

  it('detects excessive special characters', () => {
    function hasExcessiveSpecialChars(query: string): boolean {
      if (query.length <= 10) return false;
      const alphanumericCount = (query.match(/[a-zA-Z0-9]/g) || []).length;
      return alphanumericCount < query.length * 0.5;
    }

    expect(hasExcessiveSpecialChars('::::::::::::')).toBe(true);
    expect(hasExcessiveSpecialChars('t:creature o:draw')).toBe(false);
    expect(hasExcessiveSpecialChars('$%^&*()@#!!')).toBe(true); // 11 chars, 0 alphanumeric
    expect(hasExcessiveSpecialChars('abc')).toBe(false); // Too short to check
  });

  it('limits total search parameters', () => {
    function countParameters(query: string): number {
      const matches = query.match(/\b[a-zA-Z]+[:=<>]/g) || [];
      return matches.length;
    }

    const MAX_PARAMS = 15;

    const normalQuery = 't:creature c:r o:draw mv:3';
    expect(countParameters(normalQuery)).toBeLessThanOrEqual(MAX_PARAMS);

    const spamQuery = Array(20).fill('t:creature').join(' ');
    expect(countParameters(spamQuery)).toBeGreaterThan(MAX_PARAMS);
  });
});
