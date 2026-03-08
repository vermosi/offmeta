/**
 * Tests for useAuth hook.
 * Focuses on context validation and auth method contracts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth, useAuthProvider } from '@/hooks/useAuth';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => {
  const authListeners: Array<(event: string, session: unknown) => void> = [];
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi.fn((_cb: (event: string, session: unknown) => void) => {
          authListeners.push(_cb);
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }),
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
        signUp: vi.fn().mockResolvedValue({ data: { user: { identities: [{}] } }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
        updateUser: vi.fn().mockResolvedValue({ error: null }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null }),
          })),
        })),
      })),
    },
  };
});

describe('useAuth', () => {
  it('throws when used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within AuthProvider');
  });
});

describe('useAuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with loading state', async () => {
    const { result } = renderHook(() => useAuthProvider());
    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();

    // Wait for async effects to settle
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('exposes all required auth methods', async () => {
    const { result } = renderHook(() => useAuthProvider());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.signUp).toBe('function');
    expect(typeof result.current.signOut).toBe('function');
    expect(typeof result.current.resetPassword).toBe('function');
    expect(typeof result.current.updatePassword).toBe('function');
    expect(typeof result.current.refreshProfile).toBe('function');
  });

  it('signIn returns error message on failure', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
      error: { message: 'Invalid credentials' },
      data: { user: null, session: null },
    } as never);

    const { result } = renderHook(() => useAuthProvider());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    const res = await act(() => result.current.signIn('test@test.com', 'bad'));
    expect(res.error).toBe('Invalid credentials');
  });

  it('signIn returns null error on success', async () => {
    const { result } = renderHook(() => useAuthProvider());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    const res = await act(() => result.current.signIn('test@test.com', 'pass'));
    expect(res.error).toBeNull();
  });

  it('signUp detects duplicate accounts via empty identities', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({
      data: { user: { identities: [] }, session: null },
      error: null,
    } as never);

    const { result } = renderHook(() => useAuthProvider());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    const res = await act(() => result.current.signUp('dup@test.com', 'pass'));
    expect(res.error).toContain('already exists');
    expect(res.needsConfirmation).toBe(false);
  });

  it('signUp returns needsConfirmation on success', async () => {
    const { result } = renderHook(() => useAuthProvider());
    const res = await result.current.signUp('new@test.com', 'pass');
    expect(res.error).toBeNull();
    expect(res.needsConfirmation).toBe(true);
  });
});
