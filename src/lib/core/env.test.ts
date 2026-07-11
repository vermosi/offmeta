import { describe, expect, it } from 'vitest';
import { validateEnv } from '@/lib/core/env';

describe('validateEnv', () => {
  it('returns env when required values are present', () => {
    const env = validateEnv({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'public-key',
    });

    expect(env.VITE_SUPABASE_URL).toBe('https://example.supabase.co');
  });

  it('falls back to bundled values when required values are missing', () => {
    const env = validateEnv({});

    expect(env.VITE_SUPABASE_URL).toBe('https://nxmzyykkzwomkcentctt.supabase.co');
    expect(env.VITE_SUPABASE_PUBLISHABLE_KEY).toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
  });
});
