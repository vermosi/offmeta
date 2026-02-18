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

  // 4. No success toast on successful search (results appearing is sufficient feedback)
  it('does not show a success toast on successful search', async () => {
    const opts = createOptions();
    const { result } = renderHook(() => useSearchHandler(opts));

    await act(async () => {
      await result.current.handleSearch();
    });

    expect(mockToast.success).not.toHaveBeenCalled();
    expect(mockToast.error).not.toHaveBeenCalled();
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

    let searchPromise: Promise<void>;
    act(() => {
      searchPromise = result.current.handleSearch();
    });

    // Advance past the search timeout (15s) outside of act
    await act(async () => {
      vi.advanceTimersByTime(16000);
    });

    await act(async () => {
      await searchPromise!;
    });

    expect(opts.onSearch).toHaveBeenCalledTimes(1);
    const [, searchResult] = opts.onSearch.mock.calls[0];
    expect(searchResult!.source).toBe('client_fallback');
    expect(mockBuildClientFallbackQuery).toHaveBeenCalledWith('creatures that make treasure');
    expect(mockToast.error).toHaveBeenCalled();
  }, 15000);

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

  // ── Edge Cases ────────────────────────────────────────────

  // 13. Rapid concurrent searches — only latest wins
  it('rapid-fires 5 searches and only applies the last result', async () => {
    const resolvers: Array<(v: unknown) => void> = [];
    mockTranslateQueryWithDedup.mockImplementation(
      () => new Promise((r) => resolvers.push(r)),
    );

    const opts = createOptions();
    const { result } = renderHook(() => useSearchHandler(opts));

    const promises: Promise<void>[] = [];
    for (let i = 0; i < 5; i++) {
      act(() => {
        promises.push(result.current.handleSearch(`query-${i}`));
      });
    }

    // Resolve all in reverse order
    for (let i = resolvers.length - 1; i >= 0; i--) {
      await act(async () => {
        resolvers[i](createMockTranslation({ scryfallQuery: `result-${i}` }));
        await promises[i];
      });
    }

    // Only the last search (query-4, result-4) should be applied
    expect(opts.onSearch).toHaveBeenCalledTimes(1);
    expect(opts.onSearch.mock.calls[0][0]).toBe('result-4');
  });

  // 14. Whitespace-only query treated as empty
  it('treats whitespace-only query as empty', async () => {
    const opts = createOptions({ query: '   ' });
    const { result } = renderHook(() => useSearchHandler(opts));

    await act(async () => {
      await result.current.handleSearch();
    });

    expect(mockTranslateQueryWithDedup).not.toHaveBeenCalled();
    expect(opts.onSearch).not.toHaveBeenCalled();
  });

  // 15. Malformed translation result (missing fields) still works via fallback shape
  it('handles translation result with missing optional fields', async () => {
    mockTranslateQueryWithDedup.mockResolvedValue({
      scryfallQuery: 't:land',
      explanation: { readable: 'Lands', assumptions: [], confidence: 0.9 },
      showAffiliate: false,
      // source, validationIssues, intent all missing
    });

    const opts = createOptions();
    const { result } = renderHook(() => useSearchHandler(opts));

    await act(async () => {
      await result.current.handleSearch();
    });

    expect(opts.onSearch).toHaveBeenCalledTimes(1);
    const [, searchResult] = opts.onSearch.mock.calls[0];
    expect(searchResult!.source).toBe('ai'); // default when missing
    expect(searchResult!.validationIssues).toBeUndefined();
  });

  // 16. Non-Error throw (e.g., string thrown)
  it('handles non-Error thrown value gracefully', async () => {
    mockTranslateQueryWithDedup.mockRejectedValue('string error');

    const opts = createOptions();
    const { result } = renderHook(() => useSearchHandler(opts));

    await act(async () => {
      await result.current.handleSearch();
    });

    expect(opts.onSearch).toHaveBeenCalledTimes(1);
    const [, searchResult] = opts.onSearch.mock.calls[0];
    expect(searchResult!.source).toBe('client_fallback');
  });

  // 17. Rate limit blocks subsequent search and shows toast
  it('blocks search during rate limit window', async () => {
    // First trigger rate limit
    mockTranslateQueryWithDedup.mockRejectedValueOnce(new Error('429'));
    const opts = createOptions();
    const { result } = renderHook(() => useSearchHandler(opts));

    await act(async () => {
      await result.current.handleSearch();
    });

    expect(opts.onSearch).not.toHaveBeenCalled();

    // Second search within window should be blocked
    mockTranslateQueryWithDedup.mockResolvedValue(createMockTranslation());
    vi.clearAllMocks();

    await act(async () => {
      await result.current.handleSearch();
    });

    expect(mockTranslateQueryWithDedup).not.toHaveBeenCalled();
    expect(opts.onSearch).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalledWith('Please wait', expect.any(Object));
  });

  // 18. Rate limit expires and search resumes
  it('allows search after rate limit window expires', async () => {
    mockTranslateQueryWithDedup.mockRejectedValueOnce(new Error('Rate limit exceeded'));
    const opts = createOptions();
    const { result } = renderHook(() => useSearchHandler(opts));

    await act(async () => {
      await result.current.handleSearch();
    });

    expect(opts.onSearch).not.toHaveBeenCalled();

    // Advance past the 30s rate limit window
    mockTranslateQueryWithDedup.mockResolvedValue(createMockTranslation());
    await act(async () => {
      vi.advanceTimersByTime(31000);
    });

    await act(async () => {
      await result.current.handleSearch();
    });

    expect(opts.onSearch).toHaveBeenCalledTimes(1);
  });

  // 19. Abort controller is cleaned up after search completes
  it('nullifies abort controller after search', async () => {
    const opts = createOptions();
    const { result } = renderHook(() => useSearchHandler(opts));

    await act(async () => {
      await result.current.handleSearch();
    });

    // isSearching should be false — no dangling abort controller
    expect(result.current.isSearching).toBe(false);
  });

  // 20. Extremely long query is still forwarded (no truncation in handler)
  it('forwards very long queries without truncation', async () => {
    const longQuery = 'a'.repeat(500);
    const opts = createOptions({ query: longQuery });
    const { result } = renderHook(() => useSearchHandler(opts));

    await act(async () => {
      await result.current.handleSearch();
    });

    expect(mockTranslateQueryWithDedup).toHaveBeenCalledWith(
      expect.objectContaining({ query: longQuery }),
    );
  });

  // 21. Concurrent timeout and error — timeout fires first
  it('timeout wins over slow rejection', async () => {
    mockTranslateQueryWithDedup.mockImplementation(
      () => new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Slow error')), 120000);
      }),
    );

    const opts = createOptions();
    const { result } = renderHook(() => useSearchHandler(opts));

    let searchPromise: Promise<void>;
    act(() => {
      searchPromise = result.current.handleSearch();
    });

    await act(async () => {
      vi.advanceTimersByTime(16000);
    });

    await act(async () => {
      await searchPromise!;
    });

    const [, searchResult] = opts.onSearch.mock.calls[0];
    expect(searchResult!.source).toBe('client_fallback');
    expect(mockToast.error).toHaveBeenCalledWith(
      'Search took too long',
      expect.any(Object),
    );
  }, 15000);

  // 22. Multiple error variants trigger correct fallback path
  it.each([
    ['Please wait before retrying', true],  // rate-limit variant
    ['rate limited by server', true],        // rate-limit variant
    ['Server returned 500', false],          // generic error
    ['ECONNREFUSED', false],                 // network error
  ])('error "%s" → rate-limited=%s', async (msg, isRateLimited) => {
    mockTranslateQueryWithDedup.mockRejectedValue(new Error(msg));
    const opts = createOptions();
    const { result } = renderHook(() => useSearchHandler(opts));

    await act(async () => {
      await result.current.handleSearch();
    });

    if (isRateLimited) {
      expect(opts.onSearch).not.toHaveBeenCalled();
    } else {
      expect(opts.onSearch).toHaveBeenCalledTimes(1);
      const [, searchResult] = opts.onSearch.mock.calls[0];
      expect(searchResult!.source).toBe('client_fallback');
    }
  });
});
