/**
 * Branch-coverage tests for security/index.ts.
 * Targets the ~30% uncovered branches: assertion helpers, edge-cases in
 * sanitization, IP extraction, rate limiter state transitions, etc.
 * @module lib/security/branch-coverage.test
 */

import { describe, it, expect, vi } from 'vitest';
import {
  sanitizeErrorForClient,
  sanitizeStackTrace,
  containsPrototypePollution,
  sanitizeObjectKeys,
  safeJsonParse,
  isRegexSafe,
  safeTimingCompare,
  measureTimingVariance,
  testRegexPerformance,
  buildMaliciousQuery,
  getAllMaliciousPayloads,
  buildInvalidToken,
  createMockJWT as _createMockJWT, // eslint-disable-line @typescript-eslint/no-unused-vars
  buildOversizedPayload,
  buildNestedObject,
  buildCircularLikePayload,
  simulateConcurrentRequests,
  simulateBurstRequests,
  containsXSS,
  containsSQLInjection,
  sanitizeInput,
  hasRepetitiveChars,
  hasMinimumAlphanumeric,
  countQueryParameters,
  buildMockRequest,
  extractClientIP,
  expectRejected,
  expectSanitized,
  expectRateLimited,
  createMockRateLimiter,
  setupFetchMock,
  SECURITY_LIMITS as _SECURITY_LIMITS, // eslint-disable-line @typescript-eslint/no-unused-vars
} from './index';

// ── sanitizeErrorForClient ─────────────────────────────────────────────────

describe('sanitizeErrorForClient branches', () => {
  it('returns generic message for non-Error values', () => {
    expect(sanitizeErrorForClient('string error')).toBe('An error occurred');
    expect(sanitizeErrorForClient(null)).toBe('An error occurred');
    expect(sanitizeErrorForClient(42)).toBe('An error occurred');
    expect(sanitizeErrorForClient(undefined)).toBe('An error occurred');
  });

  it('redacts database connection strings', () => {
    const err = new Error('Connection failed: postgres://user:pass@host:5432/db');
    expect(sanitizeErrorForClient(err)).toContain('[CONNECTION]');
    expect(sanitizeErrorForClient(err)).not.toContain('postgres://');
  });

  it('redacts Windows paths', () => {
    const err = new Error('Error at C:\\Users\\admin\\project\\file.ts');
    expect(sanitizeErrorForClient(err)).toContain('[PATH]');
    expect(sanitizeErrorForClient(err)).not.toContain('C:\\Users');
  });

  it('redacts Bearer tokens', () => {
    const err = new Error('Auth failed: Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig');
    expect(sanitizeErrorForClient(err)).toContain('[TOKEN]');
    expect(sanitizeErrorForClient(err)).not.toContain('eyJ');
  });

  it('redacts API keys', () => {
    const err = new Error('Invalid key: sk_live_abc123xyz');
    expect(sanitizeErrorForClient(err)).toContain('[REDACTED]');
  });

  it('removes line:column numbers', () => {
    const err = new Error('Error at position:42:13');
    expect(sanitizeErrorForClient(err)).not.toMatch(/:\\d+:\\d+/);
  });

  it('redacts env var assignments', () => {
    const err = new Error('Failed: DATABASE_URL=postgres://x');
    const result = sanitizeErrorForClient(err);
    expect(result).toContain('[ENV]');
  });

  it('truncates messages over 500 characters', () => {
    const err = new Error('a'.repeat(600));
    const result = sanitizeErrorForClient(err);
    expect(result.length).toBe(500);
    expect(result.endsWith('...')).toBe(true);
  });
});

// ── sanitizeStackTrace ─────────────────────────────────────────────────────

describe('sanitizeStackTrace branches', () => {
  it('returns empty string for empty stack', () => {
    expect(sanitizeStackTrace('')).toBe('');
  });

  it('replaces stack frames with [STACK] placeholder', () => {
    const stack = 'Error: boom\n    at Object.<anonymous> (/home/user/file.ts:10:5)\n    at Module._compile';
    const result = sanitizeStackTrace(stack);
    expect(result).toContain('[STACK]');
  });

  it('sanitizes error message in first line', () => {
    const stack = 'Error: file at /secret/path.ts\n    at fn (file.ts:1:1)';
    const result = sanitizeStackTrace(stack);
    expect(result).toContain('[PATH]');
  });

  it('handles stack with no "at" lines', () => {
    const stack = 'Error: simple message\nsome other info';
    const result = sanitizeStackTrace(stack);
    expect(result).not.toContain('[STACK]');
  });
});

// ── sanitizeObjectKeys ─────────────────────────────────────────────────────

describe('sanitizeObjectKeys branches', () => {
  it('returns null/undefined as-is', () => {
    expect(sanitizeObjectKeys(null)).toBeNull();
    expect(sanitizeObjectKeys(undefined)).toBeUndefined();
  });

  it('returns primitives as-is', () => {
    expect(sanitizeObjectKeys(42)).toBe(42);
    expect(sanitizeObjectKeys('hello')).toBe('hello');
    expect(sanitizeObjectKeys(true)).toBe(true);
  });

  it('recursively sanitizes arrays', () => {
    const input = [{ __proto__: 'bad', safe: 1 }, { ok: 2 }];
    const result = sanitizeObjectKeys(input) as Record<string, unknown>[];
    expect(result[0]).not.toHaveProperty('__proto__');
    expect(result[0]).toHaveProperty('safe', 1);
  });

  it('strips prototype pollution keys from nested objects', () => {
    const input = { a: { constructor: 'bad', ok: true }, b: 1 };
    const result = sanitizeObjectKeys(input) as Record<string, unknown>;
    expect(result.a as Record<string, unknown>).not.toHaveProperty('constructor');
    expect(result.a as Record<string, unknown>).toHaveProperty('ok', true);
  });
});

// ── safeJsonParse ──────────────────────────────────────────────────────────

describe('safeJsonParse branches', () => {
  it('returns null for invalid JSON', () => {
    expect(safeJsonParse('not json')).toBeNull();
  });

  it('sanitizes parsed result', () => {
    const json = '{"safe":1,"nested":{"prototype":"x","ok":true}}';
    const result = safeJsonParse<Record<string, unknown>>(json);
    expect(result).toHaveProperty('safe', 1);
    const nested = (result as Record<string, unknown>).nested as Record<string, unknown>;
    expect(nested).not.toHaveProperty('prototype');
    expect(nested).toHaveProperty('ok', true);
  });
});

// ── isRegexSafe ────────────────────────────────────────────────────────────

describe('isRegexSafe branches', () => {
  it('detects nested quantifiers as unsafe', () => {
    expect(isRegexSafe(/(a+)+/)).toBe(false);
  });

  it('detects overlapping alternatives as unsafe', () => {
    expect(isRegexSafe(/(a|a)+/)).toBe(false);
  });

  it('detects .* followed by a letter as unsafe', () => {
    expect(isRegexSafe(/.*a/)).toBe(false);
  });

  it('returns true for safe patterns', () => {
    expect(isRegexSafe(/^[a-z]+$/)).toBe(true);
    expect(isRegexSafe(/\d{3}-\d{4}/)).toBe(true);
  });
});

// ── safeTimingCompare ──────────────────────────────────────────────────────

describe('safeTimingCompare branches', () => {
  it('returns false for different-length strings', () => {
    expect(safeTimingCompare('short', 'longer string')).toBe(false);
  });

  it('returns false for same-length but different strings', () => {
    expect(safeTimingCompare('abcd', 'abce')).toBe(false);
  });

  it('returns true for identical strings', () => {
    expect(safeTimingCompare('secret', 'secret')).toBe(true);
  });

  it('returns true for empty strings', () => {
    expect(safeTimingCompare('', '')).toBe(true);
  });
});

// ── extractClientIP ────────────────────────────────────────────────────────

describe('extractClientIP branches', () => {
  it('extracts first IP from x-forwarded-for', () => {
    const headers = { get: (k: string) => k === 'x-forwarded-for' ? '1.2.3.4, 5.6.7.8' : null };
    expect(extractClientIP(headers)).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip', () => {
    const headers = { get: (k: string) => k === 'x-real-ip' ? '10.0.0.1' : null };
    expect(extractClientIP(headers)).toBe('10.0.0.1');
  });

  it('returns default IP when no headers', () => {
    const headers = { get: () => null };
    expect(extractClientIP(headers)).toBe('127.0.0.1');
  });

  it('uses custom default IP', () => {
    const headers = { get: () => null };
    expect(extractClientIP(headers, '0.0.0.0')).toBe('0.0.0.0');
  });

  it('handles empty x-forwarded-for gracefully', () => {
    const headers = { get: (k: string) => k === 'x-forwarded-for' ? '' : null };
    expect(extractClientIP(headers)).toBe('127.0.0.1');
  });
});

// ── Assertion helpers ──────────────────────────────────────────────────────

describe('expectRejected', () => {
  it('does not throw for invalid result', () => {
    expect(() => expectRejected({ valid: false })).not.toThrow();
  });

  it('does not throw for rejected result', () => {
    expect(() => expectRejected({ valid: true, rejected: true })).not.toThrow();
  });

  it('throws for valid non-rejected result', () => {
    expect(() => expectRejected({ valid: true, rejected: false })).toThrow(/rejected/);
  });
});

describe('expectSanitized', () => {
  it('throws when no sanitized output', () => {
    expect(() => expectSanitized('input', { valid: true })).toThrow(/sanitized output/);
  });

  it('throws when sanitized contains forbidden string', () => {
    expect(() =>
      expectSanitized('input', { valid: true, sanitized: '<script>alert(1)</script>' }, ['<script>']),
    ).toThrow(/should not contain/);
  });

  it('passes when sanitized does not contain forbidden strings', () => {
    expect(() =>
      expectSanitized('input', { valid: true, sanitized: 'clean output' }, ['<script>']),
    ).not.toThrow();
  });

  it('passes with no shouldNotContain list', () => {
    expect(() =>
      expectSanitized('input', { valid: true, sanitized: 'anything' }),
    ).not.toThrow();
  });
});

describe('expectRateLimited', () => {
  it('throws when request was allowed', () => {
    expect(() => expectRateLimited({ allowed: true })).toThrow(/rate limiting/);
  });

  it('throws when retryAfter is missing', () => {
    expect(() => expectRateLimited({ allowed: false })).toThrow(/retryAfter/);
  });

  it('throws when retryAfter is zero', () => {
    expect(() => expectRateLimited({ allowed: false, retryAfter: 0 })).toThrow(/retryAfter/);
  });

  it('passes for properly rate-limited result', () => {
    expect(() => expectRateLimited({ allowed: false, retryAfter: 30 })).not.toThrow();
  });
});

// ── createMockRateLimiter ──────────────────────────────────────────────────

describe('createMockRateLimiter branches', () => {
  it('allows requests within limit', () => {
    const limiter = createMockRateLimiter(3, 60000);
    expect(limiter.check('ip1').allowed).toBe(true);
    expect(limiter.check('ip1').allowed).toBe(true);
    expect(limiter.check('ip1').allowed).toBe(true);
    expect(limiter.check('ip1').allowed).toBe(false);
  });

  it('returns retryAfter when rate limited', () => {
    const limiter = createMockRateLimiter(1, 60000);
    limiter.check('ip1');
    const result = limiter.check('ip1');
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('resets a specific key', () => {
    const limiter = createMockRateLimiter(1, 60000);
    limiter.check('ip1');
    expect(limiter.getCount('ip1')).toBe(1);
    limiter.reset('ip1');
    expect(limiter.getCount('ip1')).toBe(0);
  });

  it('resets all keys', () => {
    const limiter = createMockRateLimiter(5, 60000);
    limiter.check('ip1');
    limiter.check('ip2');
    limiter.reset();
    expect(limiter.getCount('ip1')).toBe(0);
    expect(limiter.getCount('ip2')).toBe(0);
  });

  it('resets window after expiry', () => {
    vi.useFakeTimers();
    const limiter = createMockRateLimiter(1, 1000);
    limiter.check('ip1');
    expect(limiter.check('ip1').allowed).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(limiter.check('ip1').allowed).toBe(true);
    vi.useRealTimers();
  });
});

// ── buildMockRequest ───────────────────────────────────────────────────────

describe('buildMockRequest branches', () => {
  it('uses defaults', () => {
    const req = buildMockRequest({});
    expect(req.method).toBe('POST');
    expect(req.url).toBe('https://example.com/api');
    expect(req.headers.get('missing')).toBeNull();
  });

  it('uses custom values', () => {
    const req = buildMockRequest({
      method: 'GET',
      url: 'https://test.com',
      headers: { authorization: 'Bearer x' },
      body: { q: 'test' },
    });
    expect(req.method).toBe('GET');
    expect(req.headers.get('authorization')).toBe('Bearer x');
  });
});

// ── setupFetchMock ─────────────────────────────────────────────────────────

describe('setupFetchMock', () => {
  it('returns matching response', async () => {
    const responses = new Map([['https://api.example.com/test', { status: 200, body: { ok: true } }]]);
    const mockFetch = setupFetchMock(responses);
    const result = await mockFetch('https://api.example.com/test');
    expect(result.ok).toBe(true);
    expect(await result.json()).toEqual({ ok: true });
  });

  it('returns 404 for unknown URLs', async () => {
    const mockFetch = setupFetchMock(new Map());
    const result = await mockFetch('https://unknown.com');
    expect(result.status).toBe(404);
    expect(result.ok).toBe(false);
  });
});

// ── Validation helpers ─────────────────────────────────────────────────────

describe('containsXSS branches', () => {
  it('detects various XSS patterns', () => {
    expect(containsXSS('<script>alert(1)</script>')).toBe(true);
    expect(containsXSS('javascript:alert(1)')).toBe(true);
    expect(containsXSS('<img onerror=x>')).toBe(true);
    expect(containsXSS('<iframe src=x>')).toBe(true);
    expect(containsXSS('<object data=x>')).toBe(true);
    expect(containsXSS('<embed src=x>')).toBe(true);
    expect(containsXSS('<svg onload=x>')).toBe(true);
  });

  it('returns false for safe input', () => {
    expect(containsXSS('just a normal query')).toBe(false);
  });
});

describe('containsSQLInjection branches', () => {
  it('detects SQL patterns', () => {
    expect(containsSQLInjection("'; DROP TABLE users; --")).toBe(true);
    expect(containsSQLInjection("' OR '1'='1")).toBe(true);
    expect(containsSQLInjection('UNION SELECT * FROM users')).toBe(true);
    expect(containsSQLInjection('DELETE FROM cards')).toBe(true);
    expect(containsSQLInjection('INSERT INTO users')).toBe(true);
    expect(containsSQLInjection('UPDATE users SET role')).toBe(true);
    expect(containsSQLInjection("'; TRUNCATE TABLE x; --")).toBe(true);
  });

  it('returns false for safe input', () => {
    expect(containsSQLInjection('search for creatures')).toBe(false);
  });
});

describe('sanitizeInput', () => {
  it('removes null bytes', () => {
    expect(sanitizeInput('hello\x00world')).toBe('helloworld');
  });

  it('removes control characters', () => {
    expect(sanitizeInput('hello\x01\x08world')).toBe('helloworld');
  });

  it('removes zero-width characters', () => {
    expect(sanitizeInput('hello\u200Bworld')).toBe('helloworld');
  });

  it('collapses whitespace', () => {
    expect(sanitizeInput('hello   world')).toBe('hello world');
  });
});

describe('hasRepetitiveChars branches', () => {
  it('detects repetitive characters', () => {
    expect(hasRepetitiveChars('aaaaaa')).toBe(true);
  });

  it('uses custom threshold', () => {
    expect(hasRepetitiveChars('aaa', 3)).toBe(true);
    expect(hasRepetitiveChars('aa', 3)).toBe(false);
  });

  it('returns false for normal input', () => {
    expect(hasRepetitiveChars('normal text')).toBe(false);
  });
});

describe('hasMinimumAlphanumeric branches', () => {
  it('returns true for short input (skip check)', () => {
    expect(hasMinimumAlphanumeric('!@#', 0.5)).toBe(true);
  });

  it('returns false for long mostly-symbolic input', () => {
    expect(hasMinimumAlphanumeric('!@#$%^&*()!@#$%^&*()', 0.5)).toBe(false);
  });

  it('returns true for mostly-alphanumeric input', () => {
    expect(hasMinimumAlphanumeric('hello world this is text')).toBe(true);
  });
});

describe('countQueryParameters', () => {
  it('counts Scryfall-style parameters', () => {
    expect(countQueryParameters('t:creature c:green cmc<=3')).toBe(3);
  });

  it('returns 0 for plain text', () => {
    expect(countQueryParameters('just text')).toBe(0);
  });
});

// ── simulateBurstRequests ──────────────────────────────────────────────────

describe('simulateBurstRequests branches', () => {
  it('runs requests with delay between them', async () => {
    const fn = vi.fn(async (i: number) => i);
    const { results, totalTimeMs: _totalTimeMs } = await simulateBurstRequests(3, fn, 10); // eslint-disable-line @typescript-eslint/no-unused-vars
    expect(results).toEqual([0, 1, 2]);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('runs without delay', async () => {
    const fn = vi.fn(async (i: number) => i * 2);
    const { results } = await simulateBurstRequests(2, fn, 0);
    expect(results).toEqual([0, 2]);
  });
});

// ── Token/payload builders ─────────────────────────────────────────────────

describe('buildInvalidToken branches', () => {
  it.each(['expired', 'malformed', 'modified', 'missing_claims', 'wrong_issuer'] as const)(
    'builds %s token',
    (type) => {
      const token = buildInvalidToken(type);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    },
  );
});

describe('buildMaliciousQuery', () => {
  it.each(['sql', 'xss', 'nosql', 'command', 'template'] as const)(
    'returns a %s payload',
    (type) => {
      const payload = buildMaliciousQuery(type);
      expect(typeof payload).toBe('string');
    },
  );
});

describe('getAllMaliciousPayloads', () => {
  it.each(['sql', 'xss', 'nosql', 'command', 'template'] as const)(
    'returns array for %s',
    (type) => {
      const payloads = getAllMaliciousPayloads(type);
      expect(Array.isArray(payloads)).toBe(true);
      expect(payloads.length).toBeGreaterThan(0);
    },
  );
});

describe('buildNestedObject', () => {
  it('creates leaf at depth 0', () => {
    expect(buildNestedObject(0)).toEqual({ value: 'leaf' });
  });

  it('creates nested structure', () => {
    const obj = buildNestedObject(3);
    expect(obj.nested).toBeDefined();
  });
});

// ── buildOversizedPayload ──────────────────────────────────────────────────

describe('buildOversizedPayload', () => {
  it('creates payload near target KB size', () => {
    const payload = buildOversizedPayload(1);
    expect(payload.query.length).toBeGreaterThanOrEqual(1024);
  });

  it('creates larger payloads', () => {
    const payload = buildOversizedPayload(5);
    expect(payload.query.length).toBeGreaterThanOrEqual(5 * 1024);
  });
});

// ── buildCircularLikePayload ───────────────────────────────────────────────

describe('buildCircularLikePayload', () => {
  it('creates deeply nested object', () => {
    const obj = buildCircularLikePayload();
    expect(obj).toHaveProperty('next');
    // Traverse a few levels
    let current: Record<string, unknown> = obj;
    for (let i = 0; i < 5; i++) {
      expect(current.next).toBeDefined();
      current = current.next as Record<string, unknown>;
    }
  });

  it('can be serialized (no actual circular refs)', () => {
    const obj = buildCircularLikePayload();
    expect(() => JSON.stringify(obj)).not.toThrow();
  });
});

// ── simulateConcurrentRequests ─────────────────────────────────────────────

describe('simulateConcurrentRequests', () => {
  it('runs all requests in parallel', async () => {
    const fn = vi.fn(async () => 'result');
    const results = await simulateConcurrentRequests(5, fn);
    expect(results).toHaveLength(5);
    expect(fn).toHaveBeenCalledTimes(5);
    expect(results.every((r) => r === 'result')).toBe(true);
  });

  it('handles empty count', async () => {
    const results = await simulateConcurrentRequests(0, async () => 'x');
    expect(results).toEqual([]);
  });
});

// ── measureTimingVariance ──────────────────────────────────────────────────

describe('measureTimingVariance', () => {
  it('returns stats with expected shape', () => {
    const stats = measureTimingVariance(() => { /* noop */ }, 10);
    expect(stats).toHaveProperty('mean');
    expect(stats).toHaveProperty('stdDev');
    expect(stats).toHaveProperty('min');
    expect(stats).toHaveProperty('max');
    expect(stats.mean).toBeGreaterThanOrEqual(0);
    expect(stats.stdDev).toBeGreaterThanOrEqual(0);
    expect(stats.min).toBeLessThanOrEqual(stats.max);
  });

  it('runs exact number of iterations', () => {
    let count = 0;
    measureTimingVariance(() => { count++; }, 7);
    expect(count).toBe(7);
  });
});

// ── testRegexPerformance ───────────────────────────────────────────────────

describe('testRegexPerformance', () => {
  it('uses default iterations=1', () => {
    let count = 0;
    const result = testRegexPerformance(() => { count++; });
    expect(count).toBe(1);
    expect(result.averageMs).toBe(result.duration);
  });

  it('runs multiple iterations', () => {
    let count = 0;
    const result = testRegexPerformance(() => { count++; }, 5);
    expect(count).toBe(5);
    expect(result.averageMs).toBeCloseTo(result.duration / 5, 5);
  });
});

// ── setupFetchMock additional branches ─────────────────────────────────────

describe('setupFetchMock additional', () => {
  it('exposes text() method', async () => {
    const responses = new Map([
      ['https://api.example.com/data', { status: 200, body: { key: 'val' } }],
    ]);
    const mockFetch = setupFetchMock(responses);
    const result = await mockFetch('https://api.example.com/data');
    expect(await result.text()).toBe(JSON.stringify({ key: 'val' }));
  });

  it('returns response headers when provided', async () => {
    const responses = new Map([
      ['https://api.example.com/h', { status: 200, body: {}, headers: { 'x-custom': 'yes' } }],
    ]);
    const mockFetch = setupFetchMock(responses);
    const result = await mockFetch('https://api.example.com/h');
    expect(result.headers.get('x-custom')).toBe('yes');
  });

  it('returns ok=false for 4xx status', async () => {
    const responses = new Map([
      ['https://api.example.com/err', { status: 400, body: { error: 'bad' } }],
    ]);
    const mockFetch = setupFetchMock(responses);
    const result = await mockFetch('https://api.example.com/err');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });
});

// ── buildMockRequest json() ────────────────────────────────────────────────

describe('buildMockRequest json()', () => {
  it('returns body via json()', async () => {
    const req = buildMockRequest({ body: { q: 'test' } });
    expect(await req.json()).toEqual({ q: 'test' });
  });

  it('returns undefined when no body', async () => {
    const req = buildMockRequest({});
    expect(await req.json()).toBeUndefined();
  });
});

// ── containsPrototypePollution edge cases ──────────────────────────────────

describe('containsPrototypePollution edge cases', () => {
  it('detects prototype keyword', () => {
    expect(containsPrototypePollution('set prototype to null')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(containsPrototypePollution('__PROTO__')).toBe(true);
    expect(containsPrototypePollution('CONSTRUCTOR')).toBe(true);
  });

  it('returns false for safe strings', () => {
    expect(containsPrototypePollution('just a normal string')).toBe(false);
  });
});

// ── hasMinimumAlphanumeric boundary ────────────────────────────────────────

describe('hasMinimumAlphanumeric boundary', () => {
  it('returns true for exactly 10-char input (boundary)', () => {
    expect(hasMinimumAlphanumeric('!@#$%^&*(!')).toBe(true); // length=10, skip
  });

  it('returns false for 11-char mostly-symbolic input', () => {
    expect(hasMinimumAlphanumeric('!@#$%^&*(!a', 0.5)).toBe(false); // 1/11 < 0.5
  });
});
