/**
 * Tests for useSearch hook helper functions.
 * The hook itself requires complex React Router + TanStack Query context,
 * so we test the pure utility functions extracted/inlined in the module.
 *
 * We also test the hook's integration behavior with mocked dependencies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Mock dependencies
vi.mock('@/lib/scryfall/client', () => ({
  searchCards: vi.fn().mockResolvedValue({
    data: [],
    has_more: false,
    total_cards: 0,
  }),
}));

vi.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: () => ({
    trackSearch: vi.fn(),
    trackCardClick: vi.fn(),
    trackEvent: vi.fn(),
    trackSearchFailure: vi.fn(),
    trackCardModalView: vi.fn(),
    trackAffiliateClick: vi.fn(),
    trackPagination: vi.fn(),
    trackFeedback: vi.fn(),
    shouldLogCacheEvent: vi.fn(),
  }),
}));

import { useSearch } from '@/hooks/useSearch';

function createWrapper(initialRoute = '/') {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      MemoryRouter,
      { initialEntries: [initialRoute] },
      React.createElement(QueryClientProvider, { client: qc }, children),
    );
}

describe('useSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.title = '';
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    });

    expect(result.current.searchQuery).toBe('');
    expect(result.current.originalQuery).toBe('');
    expect(result.current.hasSearched).toBe(false);
    expect(result.current.selectedCard).toBeNull();
    expect(result.current.lastSearchResult).toBeNull();
    expect(result.current.cards).toEqual([]);
    expect(result.current.displayCards).toEqual([]);
    expect(result.current.totalCards).toBe(0);
  });

  it('parses query from URL on init', () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper('/?q=mana+rocks'),
    });

    expect(result.current.originalQuery).toBe('mana rocks');
  });

  it('returns null initial filters when URL has no filter params', () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper('/'),
    });

    expect(result.current.initialUrlFilters).toBeNull();
  });

  it('parses filter state from URL', () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper('/?q=test&colors=W,U&types=creature&sort=price-asc&cmc_min=2&cmc_max=5'),
    });

    expect(result.current.initialUrlFilters).toEqual({
      colors: ['W', 'U'],
      types: ['creature'],
      sortBy: 'price-asc',
      cmcRange: [2, 5],
    });
  });

  it('handleSearch updates state correctly', () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.handleSearch('t:creature c:green', undefined, 'green creatures');
    });

    expect(result.current.searchQuery).toBe('t:creature c:green');
    expect(result.current.originalQuery).toBe('green creatures');
    expect(result.current.hasSearched).toBe(true);
  });

  it('handleSearch with result stores search result', () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    });

    const searchResult = {
      scryfallQuery: 'otag:ramp c:green',
      explanation: { readable: 'Green ramp', assumptions: [], confidence: 0.9 },
      showAffiliate: true,
    };

    act(() => {
      result.current.handleSearch('otag:ramp c:green', searchResult, 'green ramp');
    });

    expect(result.current.lastSearchResult).toEqual(
      expect.objectContaining({ scryfallQuery: 'otag:ramp c:green' }),
    );
  });

  it('handleCardClick sets selected card', () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    });

    const mockCard = {
      id: 'card-1',
      name: 'Sol Ring',
      set: 'c21',
      rarity: 'uncommon',
    } as any;

    act(() => {
      result.current.handleCardClick(mockCard, 0);
    });

    expect(result.current.selectedCard).toEqual(mockCard);
  });

  it('handleFilteredCards updates filtered state', () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    });

    const mockCards = [{ id: '1', name: 'Test' }] as any[];
    const filters = {
      colors: ['G'],
      types: [],
      cmcRange: [0, 16] as [number, number],
      sortBy: 'name-asc',
    };

    act(() => {
      result.current.handleFilteredCards(mockCards, true, filters);
    });

    expect(result.current.displayCards).toEqual(mockCards);
  });

  it('sets document title when search is active', () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.handleSearch('t:creature', undefined, 'creatures');
    });

    expect(document.title).toBe('creatures — OffMeta MTG Search');
  });

  it('resets document title when no search', () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    });

    // Default title
    expect(document.title).toBe('OffMeta — Natural Language MTG Card Search');
  });

  it('handleRerunEditedQuery updates search query', () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    });

    // First do a search to set up state
    act(() => {
      result.current.handleSearch('t:creature', undefined, 'creatures');
    });

    // Then rerun with edited query
    act(() => {
      result.current.handleRerunEditedQuery('t:creature c:red');
    });

    expect(result.current.searchQuery).toBe('t:creature c:red');
    expect(result.current.hasSearched).toBe(true);
  });

  it('exposes refs for search bar and load more', () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    });

    expect(result.current.searchBarRef).toBeDefined();
    expect(result.current.loadMoreRef).toBeDefined();
  });

  it('setSelectedCard clears selection', () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setSelectedCard(null);
    });

    expect(result.current.selectedCard).toBeNull();
  });

  it('setReportDialogOpen toggles dialog', () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setReportDialogOpen(true);
    });

    expect(result.current.reportDialogOpen).toBe(true);
  });
});
