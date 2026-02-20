/**
 * Tests for useSearchQuery hook.
 * Covers translateQueryWithDedup, rate limiting, deduplication,
 * useTranslateQuery, usePrefetchPopularQueries, and useSubmitFeedback.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock Supabase client
const mockInvoke = vi.fn();
const mockInsert = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    from: () => ({ insert: (...args: unknown[]) => mockInsert(...args) }),
  },
}));

// Must import AFTER mocks
import {
  translateQueryWithDedup,
  useTranslateQuery,
  usePrefetchPopularQueries,
  useSubmitFeedback,
} from '@/hooks/useSearchQuery';

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('translateQueryWithDedup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    // Reset module-level rate limit state by advancing time
    vi.useFakeTimers();
    vi.advanceTimersByTime(120_000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns translation result on success', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        success: true,
        scryfallQuery: 't:creature c:green',
        explanation: { readable: 'Green creatures', assumptions: [], confidence: 0.9 },
        showAffiliate: false,
        source: 'deterministic',
      },
      error: null,
    });

    const result = await translateQueryWithDedup({
      query: 'green creatures',
      bypassCache: true,
    });

    expect(result.scryfallQuery).toBe('t:creature c:green');
    expect(result.source).toBe('deterministic');
    expect(mockInvoke).toHaveBeenCalledWith('semantic-search', expect.objectContaining({
      body: expect.objectContaining({ query: 'green creatures' }),
    }));
  });

  it('throws on Supabase invoke error', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: new Error('Edge function failed'),
    });

    await expect(
      translateQueryWithDedup({ query: 'test query', bypassCache: true }),
    ).rejects.toThrow('Edge function failed');
  });

  it('throws on unsuccessful response', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { success: false, error: 'Parse error' },
      error: null,
    });

    await expect(
      translateQueryWithDedup({ query: 'bad query', bypassCache: true }),
    ).rejects.toThrow('Parse error');
  });

  it('defaults source to ai when not provided', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        success: true,
        scryfallQuery: 't:creature',
        explanation: { readable: 'Creatures', assumptions: [], confidence: 0.8 },
      },
      error: null,
    });

    const result = await translateQueryWithDedup({ query: 'creatures', bypassCache: true });
    expect(result.source).toBe('ai');
  });

  it('stores and retrieves session ID', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { success: true, scryfallQuery: 'test' },
      error: null,
    });

    await translateQueryWithDedup({ query: 'test', bypassCache: true });
    expect(sessionStorage.getItem('offmeta_session_id')).toBeTruthy();
  });
});

describe('useTranslateQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.advanceTimersByTime(120_000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is disabled when params is null', () => {
    const { result } = renderHook(() => useTranslateQuery(null), {
      wrapper: createWrapper(),
    });
    expect(result.current.isFetching).toBe(false);
  });

  it('is disabled when query is empty', () => {
    const { result } = renderHook(
      () => useTranslateQuery({ query: '  ', filters: null }),
      { wrapper: createWrapper() },
    );
    expect(result.current.isFetching).toBe(false);
  });

  it('fetches translation for valid query', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        success: true,
        scryfallQuery: 't:artifact',
        explanation: { readable: 'Artifacts', assumptions: [], confidence: 1 },
      },
      error: null,
    });

    const { result } = renderHook(
      () => useTranslateQuery({ query: 'artifacts', filters: null }),
      { wrapper: createWrapper() },
    );

    vi.useRealTimers(); // Let async work complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.scryfallQuery).toBe('t:artifact');
  });
});

describe('usePrefetchPopularQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.advanceTimersByTime(120_000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('schedules prefetch after delay', () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, scryfallQuery: 'test' },
      error: null,
    });

    renderHook(() => usePrefetchPopularQueries(), {
      wrapper: createWrapper(),
    });

    // Before 8s: no calls yet (first fires at 8000ms)
    expect(mockInvoke).not.toHaveBeenCalled();

    // After 8s: first prefetch fires
    vi.advanceTimersByTime(8100);
    expect(mockInvoke).toHaveBeenCalledTimes(1);

    // After 3s more: second prefetch fires (8000 + 1*3000 = 11000ms total)
    vi.advanceTimersByTime(3000);
    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });
});

describe('useSubmitFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits feedback successfully', async () => {
    mockInsert.mockResolvedValueOnce({ error: null });

    const { result } = renderHook(() => useSubmitFeedback(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        originalQuery: 'green ramp',
        translatedQuery: 'otag:ramp c:green',
        issueDescription: 'Missing mana dorks',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        original_query: 'green ramp',
        translated_query: 'otag:ramp c:green',
        issue_description: 'Missing mana dorks',
      }),
    );
  });

  it('handles feedback submission error', async () => {
    mockInsert
      .mockResolvedValueOnce({ error: { message: 'fail', code: '42000' } })
      .mockResolvedValueOnce({ error: { message: 'fail', code: '42000' } })
      .mockResolvedValueOnce({ error: { message: 'fail', code: '42000' } });

    const { result } = renderHook(() => useSubmitFeedback(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        originalQuery: 'test',
        translatedQuery: 'test',
        issueDescription: 'test',
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
  });
});
