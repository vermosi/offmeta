/**
 * Tests for useUserRole hook.
 * @module hooks/__tests__/useUserRole.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock useAuth
const mockUser = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser(), isLoading: false }),
}));

// Mock supabase
const mockMaybeSingle = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: mockMaybeSingle,
          }),
        }),
      }),
    }),
  },
}));

import { useUserRole } from '../useUserRole';

describe('useUserRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns hasRole false and isLoading false when no user', () => {
    mockUser.mockReturnValue(null);
    const { result } = renderHook(() => useUserRole('admin'));

    expect(result.current.hasRole).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns isLoading true initially when user exists', async () => {
    mockUser.mockReturnValue({ id: 'user-1' });
    let resolvePromise: ((value: { data: null }) => void) | null = null as ((value: { data: null }) => void) | null;
    mockMaybeSingle.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
    );

    const { result } = renderHook(() => useUserRole('admin'));
    expect(result.current.isLoading).toBe(true);

    resolvePromise?.({ data: null });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('resolves hasRole true when role exists', async () => {
    mockUser.mockReturnValue({ id: 'user-1' });
    mockMaybeSingle.mockResolvedValue({ data: { role: 'admin' } });

    const { result } = renderHook(() => useUserRole('admin'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.hasRole).toBe(true);
  });

  it('resolves hasRole false when role does not exist', async () => {
    mockUser.mockReturnValue({ id: 'user-1' });
    mockMaybeSingle.mockResolvedValue({ data: null });

    const { result } = renderHook(() => useUserRole('moderator'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.hasRole).toBe(false);
  });
});
