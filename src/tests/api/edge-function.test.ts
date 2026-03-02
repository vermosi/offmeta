/**
 * HTTP-level security tests for edge functions.
 *
 * These tests call the live deployed semantic-search edge function
 * and verify security behaviour (auth, CORS, error sanitization).
 *
 * Gated behind RUN_API_TESTS=1 to avoid flaky CI from external calls.
 */

import { describe, it, expect } from 'vitest';

const RUN_API_TESTS = process.env.RUN_API_TESTS === '1';
const describeIf = RUN_API_TESTS ? describe : describe.skip;

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? 'https://nxmzyykkzwomkcentctt.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/semantic-search`;

describeIf('Edge Function HTTP Security', () => {
  it('returns 400 for empty body', async () => {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const body = await res.text();
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    void body; // consumed to avoid leak
  });

  it('returns 401 for missing auth header', async () => {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: 'cheap green ramp' }),
    });

    const body = await res.text();
    // Supabase returns 401 when no Authorization header is present
    expect(res.status).toBe(401);
    void body;
  });

  it('does not reflect evil origin in access-control-allow-origin', async () => {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://evil.example.com',
        'Access-Control-Request-Method': 'POST',
      },
    });

    const body = await res.text();
    const allowedOrigin = res.headers.get('access-control-allow-origin');
    expect(allowedOrigin).not.toBe('https://evil.example.com');
    void body;
  });

  it('error response body does not leak file paths', async () => {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      // Send an intentionally malformed payload to trigger error handling
      body: '{"query": "' + 'x'.repeat(10000) + '"}',
    });

    const body = await res.text();
    // Response should not contain TypeScript file paths with line numbers
    expect(body).not.toMatch(/\.ts:\d+/);
    // Response should not contain stack traces
    expect(body).not.toMatch(/at\s+\S+\s+\(/);
  });
});
