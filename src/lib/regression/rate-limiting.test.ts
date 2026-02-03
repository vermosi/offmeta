/**
 * Regression tests for rate limiting functionality.
 * Tests EDGE_RATE_001: Session-level rate limiting
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ============================================================================
// Session Rate Limiting Tests (EDGE_RATE_001)
// ============================================================================

describe('Regression: EDGE_RATE_001 - Session Rate Limiting', () => {
  // Local implementation for testing the algorithm
  // The actual implementation is in supabase/functions/_shared/rateLimit.ts

  interface RateLimitEntry {
    count: number;
    resetTime: number;
  }

  let sessionLimiter: Map<string, RateLimitEntry>;
  const SESSION_LIMIT = 20;
  const SESSION_WINDOW_MS = 60000;

  function checkSessionRateLimit(
    sessionId: string | null,
    windowMs: number = SESSION_WINDOW_MS,
    limit: number = SESSION_LIMIT,
  ): { allowed: boolean; retryAfter?: number } {
    if (!sessionId) return { allowed: true };

    const now = Date.now();
    const entry = sessionLimiter.get(sessionId);

    if (!entry || now > entry.resetTime) {
      sessionLimiter.set(sessionId, { count: 1, resetTime: now + windowMs });
      return { allowed: true };
    }

    if (entry.count >= limit) {
      return {
        allowed: false,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      };
    }

    entry.count++;
    return { allowed: true };
  }

  beforeEach(() => {
    sessionLimiter = new Map();
  });

  it('allows requests when no session ID is provided', () => {
    const result = checkSessionRateLimit(null);
    expect(result.allowed).toBe(true);
    expect(result.retryAfter).toBeUndefined();
  });

  it('allows first request for a new session', () => {
    const result = checkSessionRateLimit('session-123');
    expect(result.allowed).toBe(true);
  });

  it('allows first 20 requests within the window', () => {
    const sessionId = 'test-session';

    // First 20 should succeed
    for (let i = 0; i < 20; i++) {
      const result = checkSessionRateLimit(sessionId);
      expect(result.allowed).toBe(true);
    }
  });

  it('blocks requests 21-25 after hitting the limit', () => {
    const sessionId = 'test-session-blocking';

    // First 20 should succeed
    for (let i = 0; i < 20; i++) {
      checkSessionRateLimit(sessionId);
    }

    // Next 5 should fail
    for (let i = 0; i < 5; i++) {
      const result = checkSessionRateLimit(sessionId);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    }
  });

  it('returns retryAfter value when rate limited', () => {
    const sessionId = 'test-retry-after';

    // Exhaust the limit
    for (let i = 0; i < 20; i++) {
      checkSessionRateLimit(sessionId);
    }

    // Check retryAfter
    const result = checkSessionRateLimit(sessionId);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeDefined();
    expect(result.retryAfter).toBeGreaterThan(0);
    expect(result.retryAfter).toBeLessThanOrEqual(60); // Should be <= 60 seconds
  });

  it('resets after the window expires', () => {
    // Use a very short window for this test
    const shortWindowMs = 100;
    const sessionId = 'test-reset';

    // Make requests up to limit
    for (let i = 0; i < 20; i++) {
      checkSessionRateLimit(sessionId, shortWindowMs);
    }

    // Should be blocked
    expect(checkSessionRateLimit(sessionId, shortWindowMs).allowed).toBe(false);

    // Simulate window expiration by manipulating the entry
    const entry = sessionLimiter.get(sessionId);
    if (entry) {
      entry.resetTime = Date.now() - 1000; // Set to past
    }

    // Should be allowed again
    const result = checkSessionRateLimit(sessionId, shortWindowMs);
    expect(result.allowed).toBe(true);
  });

  it('tracks different sessions independently', () => {
    const session1 = 'session-a';
    const session2 = 'session-b';

    // Exhaust session 1
    for (let i = 0; i < 20; i++) {
      checkSessionRateLimit(session1);
    }

    // Session 1 should be blocked
    expect(checkSessionRateLimit(session1).allowed).toBe(false);

    // Session 2 should still be allowed
    expect(checkSessionRateLimit(session2).allowed).toBe(true);
  });

  it('respects custom limit parameter', () => {
    const sessionId = 'custom-limit-session';
    const customLimit = 5;

    // First 5 should succeed
    for (let i = 0; i < customLimit; i++) {
      const result = checkSessionRateLimit(
        sessionId,
        SESSION_WINDOW_MS,
        customLimit,
      );
      expect(result.allowed).toBe(true);
    }

    // 6th should fail
    const result = checkSessionRateLimit(
      sessionId,
      SESSION_WINDOW_MS,
      customLimit,
    );
    expect(result.allowed).toBe(false);
  });
});
