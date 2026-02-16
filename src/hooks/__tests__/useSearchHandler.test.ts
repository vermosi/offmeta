/**
 * Integration tests for useSearchHandler hook.
 * Validates the search orchestration pipeline: translation, fallback,
 * rate limiting, abort control, and toast notifications.
 * @module hooks/__tests__/useSearchHandler.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createMockTranslation } from '@/test/factories';
import type { SearchResult } from '@/components/UnifiedSearchBar';

// ── Mocks ──────────────────────────────────────────────────

const mockTranslateQueryWithDedup = vi.fn();
vi.mock('@/hooks/useSearchQuery', () => ({
  translateQueryWithDedup: (params: unknown) =>
    mockTranslateQueryWithDedup(params),
}));

const mockBuildClientFallbackQuery = vi.fn((q: string) => `o:"${q}"`);
vi.mock('@/lib/search/fallback', () => ({
  buildClientFallbackQuery: (q: string) =>
    mockBuildClientFallbackQuery(q),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/core/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// Import after mocks are defined
import { useSearchHandler } from '@/hooks/useSearchHandler';
import { toast } from 'sonner';

const mockToast = toast as unknown as { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

// ── Helpers ────────────────────────────────────────────────

type OnSearchFn = (query: string, result?: SearchResult, naturalQuery?: string) => void;

function createOptions(overrides?: Record<string, unknown>) {
  return {
    query: 'creatures that make treasure',
    onSearch: vi.fn<OnSearchFn>(),
    addToHistory: vi.fn(),
    saveContext: vi.fn(),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────

describe('useSearchHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockTranslateQueryWithDedup.mockResolvedValue(createMockTranslation());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // 1. Successful translation
  it('calls onSearch with translated query on success', async () => {
    const opts = createOptions();
    const { result } = renderHook(() => useSearchHandler(opts));

    await act(async () => {
      await result.current.handleSearch();
    });

    expect(opts.onSearch).toHaveBeenCalledTimes(1);
    const [query, searchResult] = opts.onSearch.mock.calls[0];
    expect(query).toBe('t:creature');
    expect(searchResult!.scryfallQuery).toBe('t:creature');
    expect(searchResult!.source).toBe('deterministic');
  });

  // 2. Adds to history
  it('adds query to history on search', async () => {
    const opts = createOptions();
    const { result } = renderHook(() => useSearchHandler(opts));

    await act(async () => {
      await result.current.handleSearch();
    });

    expect(opts.addToHistory).toHaveBeenCalledWith('creatures that make treasure');
  });

  // 3. Saves context
  it('saves search context after successful translation', async () => {
    const opts = createOptions();
    const { result } = renderHook(() => useSearchHandler(opts));

    await act(async () => {
      await result.current.handleSearch();
    });

    expect(opts.saveContext).toHaveBeenCalledWith(
      'creatures that make treasure',
      't:creature',
    );
  });

  // 4. Shows success toast
  it('shows success toast with truncated query preview', async () => {
    const opts = createOptions();
    const { result } = renderHook(() => useSearchHandler(opts));

    await act(async () => {
      await result.current.handleSearch();
    });

    expect(mockToast.success).toHaveBeenCalledTimes(1);
    expect(mockToast.success.mock.calls[0][0]).toContain('Search translated');
  });

  // 5. Empty query prevention
  it('does nothing when query is empty', async () => {
    const opts = createOptions({ query: '' });
    const { result } = renderHook(() => useSearchHandler(opts));

    await act(async () => {
      await result.current.handleSearch();
    });

    expect(mockTranslateQueryWithDedup).not.toHaveBeenCalled();
    expect(opts.onSearch).not.toHaveBeenCalled();
  });

  // 6. Timeout fallback
  it('falls back to client query on timeout', async () => {
    mockTranslateQueryWithDedup.mockImplementation(
      () => new Promise(() => {}), // never resolves
    );

    const opts = createOptions();
    const { result } = renderHook(() => useSearchHandler(opts));

    await act(async () => {
      const searchPromise = result.current.handleSearch();
      // Advance past the search timeout (15s)
      vi.advanceTimersByTime(16000);
      await searchPromise;
    });

    expect(opts.onSearch).toHaveBeenCalledTimes(1);
    const [, searchResult] = opts.onSearch.mock.calls[0];
    expect(searchResult!.source).toBe('client_fallback');
    expect(mockBuildClientFallbackQuery).toHaveBeenCalledWith('creatures that make treasure');
    expect(mockToast.error).toHaveBeenCalled();
  });

  // 7. Error fallback
  it('falls back to client query on generic error', async () => {
    mockTranslateQueryWithDedup.mockRejectedValue(new Error('Network error'));

    const opts = createOptions();
    const { result } = renderHook(() => useSearchHandler(opts));

    await act(async () => {
      await result.current.handleSearch();
    });

    expect(opts.onSearch).toHaveBeenCalledTimes(1);
    const [, searchResult] = opts.onSearch.mock.calls[0];
    expect(searchResult!.source).toBe('client_fallback');
    expect(mockToast.error).toHaveBeenCalled();
  });

  // 8. Rate limit handling (429)
  it('sets rate limit on 429 error and blocks subsequent searches', async () => {
    mockTranslateQueryWithDedup.mockRejectedValue(new Error('429 Too Many Requests'));

    const opts = createOptions();
    const { result } = renderHook(() => useSearchHandler(opts));

    await act(async () => {
      await result.current.handleSearch();
    });

    // onSearch should NOT be called on rate limit
    expect(opts.onSearch).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalledWith(
      'Too many searches',
      expect.objectContaining({ description: expect.any(String) }),
    );
  });

  // 9. Custom search query parameter
  it('uses provided searchQuery parameter over default query', async () => {
    const opts = createOptions({ query: 'default query' });
    const { result } = renderHook(() => useSearchHandler(opts));

    await act(async () => {
      await result.current.handleSearch('override query');
    });

    expect(mockTranslateQueryWithDedup).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'override query' }),
    );
    expect(opts.addToHistory).toHaveBeenCalledWith('override query');
  });

  // 10. bypassCache and cacheSalt forwarded
  it('forwards bypassCache and cacheSalt to translation', async () => {
    const opts = createOptions();
    const { result } = renderHook(() => useSearchHandler(opts));

    await act(async () => {
      await result.current.handleSearch(undefined, {
        bypassCache: true,
        cacheSalt: 'test-salt',
      });
    });

    expect(mockTranslateQueryWithDedup).toHaveBeenCalledWith(
      expect.objectContaining({
        bypassCache: true,
        cacheSalt: 'test-salt',
      }),
    );
  });

  // 11. Request cancellation (stale token)
  it('ignores stale response when a newer search is triggered', async () => {
    let resolveFirst: (v: unknown) => void;
    const firstPromise = new Promise((r) => { resolveFirst = r; });
    const secondResult = createMockTranslation({
      scryfallQuery: 't:artifact',
      source: 'ai',
    });

    mockTranslateQueryWithDedup
      .mockReturnValueOnce(firstPromise)
      .mockResolvedValueOnce(secondResult);

    const opts = createOptions();
    const { result } = renderHook(() => useSearchHandler(opts));

    // Fire first search
    let firstSearch: Promise<void>;
    act(() => {
      firstSearch = result.current.handleSearch('first query');
    });

    // Fire second search before first resolves
    await act(async () => {
      await result.current.handleSearch('second query');
    });

    // Now resolve the first (stale)
    await act(async () => {
      resolveFirst!(createMockTranslation({ scryfallQuery: 't:enchantment' }));
      await firstSearch!;
    });

    // Only the second search result should have been applied
    expect(opts.onSearch).toHaveBeenCalledTimes(1);
    expect(opts.onSearch.mock.calls[0][0]).toBe('t:artifact');
  });

  // 12. isSearching state management
  it('sets isSearching during search and resets after', async () => {
    const opts = createOptions();
    const { result } = renderHook(() => useSearchHandler(opts));

    expect(result.current.isSearching).toBe(false);

    let searchPromise: Promise<void>;
    act(() => {
      searchPromise = result.current.handleSearch();
    });

    // During search
    expect(result.current.isSearching).toBe(true);

    await act(async () => {
      await searchPromise;
    });

    expect(result.current.isSearching).toBe(false);
  });
});
