/**
 * Tests edge auth validation helper paths used by backend functions.
 * @module lib/security/edge-auth-validation
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validateAuth } from '../../../supabase/functions/_shared/auth.ts';

function setDenoEnv(values: Record<string, string | undefined>) {
  Object.defineProperty(globalThis, 'Deno', {
    configurable: true,
    value: {
      env: {
        get: (key: string) => values[key],
      },
    },
  });
}

describe('validateAuth edge helper', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('authorizes authenticated JWT via auth user endpoint', async () => {
    setDenoEnv({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon-key',
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'user-123' }),
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const req = new Request('https://functions.example/deck-critique', {
      headers: {
        Authorization: 'Bearer valid.jwt.token',
      },
    });

    const result = await validateAuth(req);

    expect(result).toEqual({ authorized: true, role: 'authenticated' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/auth/v1/user',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer valid.jwt.token',
          apikey: 'anon-key',
        }),
      }),
    );
  });

  it('rejects requests with missing Authorization header', async () => {
    setDenoEnv({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_ANON_KEY: 'anon-key',
    });

    const req = new Request('https://functions.example/deck-critique');
    const result = await validateAuth(req);

    expect(result).toEqual({
      authorized: false,
      error: 'Missing Authorization header',
    });
  });
});
