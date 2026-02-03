import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

// Stub Deno global before imports
const mockGet = vi.fn();
vi.stubGlobal('Deno', {
  env: {
    get: mockGet,
  },
});

import {
  validateAuth,
  getCorsHeaders,
} from '../../supabase/functions/_shared/auth.ts';
import {
  checkRateLimit,
  cleanupRateLimiter,
} from '../../supabase/functions/_shared/rateLimit.ts';

describe('Edge Functions Shared Utils', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  afterAll(() => {
    cleanupRateLimiter();
  });

  describe('validateAuth', () => {
    it('returns false if no header', () => {
      const req = new Request('http://localhost', { headers: {} });
      expect(validateAuth(req)).toEqual({
        authorized: false,
        error: 'Missing Authorization header',
      });
    });

    it('validates service role key', () => {
      mockGet.mockImplementation((key) =>
        key === 'SUPABASE_SERVICE_ROLE_KEY' ? 'secret-key' : null,
      );
      const req = new Request('http://localhost', {
        headers: { Authorization: 'Bearer secret-key' },
      });
      expect(validateAuth(req)).toEqual({ authorized: true, role: 'service' });
    });

    it('validates api secret', () => {
      mockGet.mockImplementation((key) =>
        key === 'OFFMETA_API_SECRET' ? 'api-key' : null,
      );
      const req = new Request('http://localhost', {
        headers: { Authorization: 'Bearer api-key' },
      });
      expect(validateAuth(req)).toEqual({ authorized: true, role: 'api' });
    });

    it('rejects invalid key', () => {
      mockGet.mockImplementation((key) =>
        key === 'SUPABASE_SERVICE_ROLE_KEY' ? 'secret-key' : null,
      );
      const req = new Request('http://localhost', {
        headers: { Authorization: 'Bearer wrong-key' },
      });
      expect(validateAuth(req)).toEqual({
        authorized: false,
        error: 'Invalid Authorization token',
      });
    });
  });

  describe('getCorsHeaders', () => {
    it('echoes origin if allowed', () => {
      mockGet.mockReturnValue('https://allowed.com');
      const req = new Request('http://localhost', {
        headers: { Origin: 'https://allowed.com' },
      });
      const headers = getCorsHeaders(req);
      expect(headers['Access-Control-Allow-Origin']).toBe(
        'https://allowed.com',
      );
    });

    it('defaults to first allowed if origin not match', () => {
      mockGet.mockReturnValue('https://allowed.com');
      const req = new Request('http://localhost', {
        headers: { Origin: 'https://evil.com' },
      });
      const headers = getCorsHeaders(req);
      expect(headers['Access-Control-Allow-Origin']).toBe(
        'https://allowed.com',
      );
    });

    it('allows *', () => {
      mockGet.mockReturnValue('*');
      const req = new Request('http://localhost', {
        headers: { Origin: 'https://any.com' },
      });
      const headers = getCorsHeaders(req);
      expect(headers['Access-Control-Allow-Origin']).toBe('https://any.com');
    });
  });

  describe('checkRateLimit', () => {
    it('allows requests within limit', async () => {
      const ip = '1.2.3.4';
      const result = await checkRateLimit(ip, undefined, 10, 100);
      expect(result.allowed).toBe(true);
    });

    it('blocks requests over limit', async () => {
      const ip = '1.2.3.5';
      const result1 = await checkRateLimit(ip, undefined, 1, 100);
      expect(result1.allowed).toBe(true);

      const result2 = await checkRateLimit(ip, undefined, 1, 100);
      expect(result2.allowed).toBe(false);
      expect(result2.retryAfter).toBeGreaterThan(0);
    });
  });
});
