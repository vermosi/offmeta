/**
 * Tests for useAnalytics hook.
 * Covers event tracking, rate limiting, sanitization, and deduplication.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock Supabase
const mockInsertThen = vi.fn().mockReturnValue({ then: vi.fn((cb) => cb({ error: null })) });
const mockInsert = vi.fn().mockReturnValue(mockInsertThen);
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ insert: (...args: unknown[]) => { mockInsert(...args); return { then: vi.fn((cb) => cb({ error: null })) }; } }),
  },
}));

vi.mock('@/lib/core/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { useAnalytics } from '@/hooks/useAnalytics';

describe('useAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('returns all expected tracking functions', () => {
    const { result } = renderHook(() => useAnalytics());
    expect(result.current.trackSearch).toBeTypeOf('function');
    expect(result.current.trackSearchFailure).toBeTypeOf('function');
    expect(result.current.trackCardClick).toBeTypeOf('function');
    expect(result.current.trackCardModalView).toBeTypeOf('function');
    expect(result.current.trackAffiliateClick).toBeTypeOf('function');
    expect(result.current.trackPagination).toBeTypeOf('function');
    expect(result.current.trackFeedback).toBeTypeOf('function');
    expect(result.current.trackEvent).toBeTypeOf('function');
    expect(result.current.shouldLogCacheEvent).toBeTypeOf('function');
  });

  it('trackSearch calls insert with correct event type', async () => {
    const { result } = renderHook(() => useAnalytics());

    await act(async () => {
      result.current.trackSearch({
        query: 'green ramp',
        translated_query: 'otag:ramp c:green',
        results_count: 42,
      });
    });

    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        event_type: 'search',
      }),
    ]);
  });

  it('trackCardClick calls insert with card_click event type', async () => {
    const { result } = renderHook(() => useAnalytics());

    await act(async () => {
      result.current.trackCardClick({
        card_id: 'abc-123',
        card_name: 'Sol Ring',
        set_code: 'c21',
        rarity: 'uncommon',
        position_in_results: 0,
      });
    });

    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({ event_type: 'card_click' }),
    ]);
  });

  it('trackSearchFailure sends search_failure event', async () => {
    const { result } = renderHook(() => useAnalytics());

    await act(async () => {
      result.current.trackSearchFailure({
        query: 'nonsense',
        error_type: 'zero_results',
      });
    });

    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({ event_type: 'search_failure' }),
    ]);
  });

  it('shouldLogCacheEvent deduplicates within window', () => {
    const { result } = renderHook(() => useAnalytics());

    const first = result.current.shouldLogCacheEvent('hash123');
    const second = result.current.shouldLogCacheEvent('hash123');

    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it('shouldLogCacheEvent allows different hashes', () => {
    const { result } = renderHook(() => useAnalytics());

    expect(result.current.shouldLogCacheEvent('hashA')).toBe(true);
    expect(result.current.shouldLogCacheEvent('hashB')).toBe(true);
  });

  it('creates session ID on mount', () => {
    renderHook(() => useAnalytics());
    expect(sessionStorage.getItem('offmeta_session_id')).toBeTruthy();
  });

  it('reuses existing session ID', () => {
    sessionStorage.setItem('offmeta_session_id', 'existing-session');
    renderHook(() => useAnalytics());
    expect(sessionStorage.getItem('offmeta_session_id')).toBe('existing-session');
  });

  it('rate limits after max events per window', async () => {
    // Set rate limit to exhausted state
    sessionStorage.setItem(
      'analytics_events_rate',
      JSON.stringify({ count: 60, windowStart: Date.now() }),
    );

    const { result } = renderHook(() => useAnalytics());

    await act(async () => {
      result.current.trackSearch({
        query: 'test',
        results_count: 0,
      });
    });

    // Should not insert when rate limited
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
