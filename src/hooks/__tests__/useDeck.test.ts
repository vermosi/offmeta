/**
 * Tests for useDeck module.
 * Focuses on the ensureSession utility and type exports.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensureSession } from '@/hooks/useDeck';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: {}, error: null }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-123' } })),
}));

describe('ensureSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves when a session exists', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: { user: { id: 'u1' } } },
    } as never);

    await expect(ensureSession()).resolves.toBeUndefined();
  });

  it('throws when no session exists', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
    } as never);

    await expect(ensureSession()).rejects.toThrow('No active session');
  });
});

describe('Deck type exports', () => {
  it('exports Deck and DeckCard interfaces', async () => {
    const mod = await import('@/hooks/useDeck');
    // Verify the module exports the hooks (runtime check)
    expect(typeof mod.useDecks).toBe('function');
    expect(typeof mod.useDeck).toBe('function');
    expect(typeof mod.useDeckCards).toBe('function');
    expect(typeof mod.useDeckMutations).toBe('function');
    expect(typeof mod.useDeckCardMutations).toBe('function');
  });
});
