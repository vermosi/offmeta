/**
 * CORS Bypass Prevention Tests
 *
 * Tests for CORS policy enforcement and security headers in edge functions.
 * Verifies that origin allowlists work correctly and security headers are present.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Deno environment
const mockEnvGet = vi.fn();
vi.stubGlobal('Deno', {
  env: {
    get: mockEnvGet,
  },
});

// Import after mocking
import { getCorsHeaders } from '@/../supabase/functions/_shared/auth';

describe('CORS Bypass Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Origin Validation', () => {
    it('returns wildcard when ALLOWED_ORIGINS not configured', () => {
      mockEnvGet.mockReturnValue(undefined);
      const req = new Request('http://localhost', {
        headers: { Origin: 'https://any-site.com' },
      });

      const headers = getCorsHeaders(req);

      expect(headers['Access-Control-Allow-Origin']).toBe('https://any-site.com');
    });

    it('reflects allowed origin when in allowlist', () => {
      mockEnvGet.mockReturnValue('https://offmeta.lovable.app,https://localhost:5173');
      const req = new Request('http://localhost', {
        headers: { Origin: 'https://offmeta.lovable.app' },
      });

      const headers = getCorsHeaders(req);

      expect(headers['Access-Control-Allow-Origin']).toBe('https://offmeta.lovable.app');
    });

    it('falls back to first allowed origin when origin not in allowlist', () => {
      mockEnvGet.mockReturnValue('https://offmeta.lovable.app,https://localhost:5173');
      const req = new Request('http://localhost', {
        headers: { Origin: 'https://evil-site.com' },
      });

      const headers = getCorsHeaders(req);

      expect(headers['Access-Control-Allow-Origin']).toBe('https://offmeta.lovable.app');
      expect(headers['Access-Control-Allow-Origin']).not.toBe('https://evil-site.com');
    });

    it('handles missing Origin header gracefully', () => {
      mockEnvGet.mockReturnValue('https://offmeta.lovable.app');
      const req = new Request('http://localhost');

      const headers = getCorsHeaders(req);

      // Should fallback to first allowed origin
      expect(headers['Access-Control-Allow-Origin']).toBe('https://offmeta.lovable.app');
    });

    it('handles empty string Origin header', () => {
      mockEnvGet.mockReturnValue('https://offmeta.lovable.app');
      const req = new Request('http://localhost', {
        headers: { Origin: '' },
      });

      const headers = getCorsHeaders(req);

      expect(headers['Access-Control-Allow-Origin']).toBeDefined();
    });

    it('allows wildcard in ALLOWED_ORIGINS for any origin', () => {
      mockEnvGet.mockReturnValue('*');
      const req = new Request('http://localhost', {
        headers: { Origin: 'https://any-random-site.com' },
      });

      const headers = getCorsHeaders(req);

      expect(headers['Access-Control-Allow-Origin']).toBe('https://any-random-site.com');
    });

    it('handles localhost variations correctly', () => {
      mockEnvGet.mockReturnValue('http://localhost:5173,http://127.0.0.1:5173');
      const req = new Request('http://localhost', {
        headers: { Origin: 'http://localhost:5173' },
      });

      const headers = getCorsHeaders(req);

      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
    });

    it('is case-sensitive for origin matching', () => {
      mockEnvGet.mockReturnValue('https://OffMeta.lovable.app');
      const req = new Request('http://localhost', {
        headers: { Origin: 'https://offmeta.lovable.app' },
      });

      const headers = getCorsHeaders(req);

      // Should NOT match due to case difference
      expect(headers['Access-Control-Allow-Origin']).toBe('https://OffMeta.lovable.app');
    });
  });

  describe('Security Headers', () => {
    it('includes X-Content-Type-Options header', () => {
      mockEnvGet.mockReturnValue('*');
      const req = new Request('http://localhost');

      const headers = getCorsHeaders(req);

      expect(headers['X-Content-Type-Options']).toBe('nosniff');
    });

    it('includes X-Frame-Options header', () => {
      mockEnvGet.mockReturnValue('*');
      const req = new Request('http://localhost');

      const headers = getCorsHeaders(req);

      expect(headers['X-Frame-Options']).toBe('DENY');
    });

    it('includes Strict-Transport-Security header', () => {
      mockEnvGet.mockReturnValue('*');
      const req = new Request('http://localhost');

      const headers = getCorsHeaders(req);

      expect(headers['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains');
    });

    it('includes required Access-Control-Allow-Headers', () => {
      mockEnvGet.mockReturnValue('*');
      const req = new Request('http://localhost');

      const headers = getCorsHeaders(req);

      const allowedHeaders = headers['Access-Control-Allow-Headers'];
      expect(allowedHeaders).toContain('authorization');
      expect(allowedHeaders).toContain('content-type');
      expect(allowedHeaders).toContain('apikey');
      expect(allowedHeaders).toContain('x-request-id');
    });

    it('includes required Access-Control-Allow-Methods', () => {
      mockEnvGet.mockReturnValue('*');
      const req = new Request('http://localhost');

      const headers = getCorsHeaders(req);

      const allowedMethods = headers['Access-Control-Allow-Methods'];
      expect(allowedMethods).toContain('POST');
      expect(allowedMethods).toContain('GET');
      expect(allowedMethods).toContain('OPTIONS');
    });
  });

  describe('Attack Scenarios', () => {
    it('prevents origin with embedded allowed domain', () => {
      mockEnvGet.mockReturnValue('https://offmeta.lovable.app');
      const req = new Request('http://localhost', {
        headers: { Origin: 'https://offmeta.lovable.app.evil.com' },
      });

      const headers = getCorsHeaders(req);

      expect(headers['Access-Control-Allow-Origin']).not.toBe(
        'https://offmeta.lovable.app.evil.com',
      );
    });

    it('prevents subdomain bypass attempts', () => {
      mockEnvGet.mockReturnValue('https://offmeta.lovable.app');
      const req = new Request('http://localhost', {
        headers: { Origin: 'https://evil.offmeta.lovable.app' },
      });

      const headers = getCorsHeaders(req);

      expect(headers['Access-Control-Allow-Origin']).not.toBe('https://evil.offmeta.lovable.app');
    });

    it('prevents null origin attacks', () => {
      mockEnvGet.mockReturnValue('https://offmeta.lovable.app');
      const req = new Request('http://localhost', {
        headers: { Origin: 'null' },
      });

      const headers = getCorsHeaders(req);

      expect(headers['Access-Control-Allow-Origin']).not.toBe('null');
    });
  });
});
