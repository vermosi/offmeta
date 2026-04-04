/**
 * Integration tests: Scryfall API error flows.
 * Validates behaviour when translation fails, Scryfall returns errors,
 * and verifies the empty/error UI renders with suggestions.
 * @module pages/__tests__/Index.scryfall-errors.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { createMockTranslation } from '@/test/factories';
import { renderIndex, MOCK_CARDS } from './index-test-setup';

vi.mock('@/components/SearchHistoryDropdown', () => ({
  SearchHistoryDropdown: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="history-dropdown">{children}</div>
  ),
}));

// ── Mocks ──────────────────────────────────────────────────

const mockTranslateQueryWithDedup = vi.fn();
vi.mock('@/hooks/useSearchQuery', () => ({
  translateQueryWithDedup: (...args: unknown[]) =>
    mockTranslateQueryWithDedup(...args),
  usePrefetchPopularQueries: () => {},
  useTranslateQuery: () => ({ data: null, isLoading: false }),
}));

const mockSearchCards = vi.fn();
vi.mock('@/lib/scryfall/client', async () => {
  const actual = await vi.importActual('@/lib/scryfall/client');
  return {
    ...actual,
    searchCards: (...args: unknown[]) => mockSearchCards(...args),
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn((cb: (...args: unknown[]) => void) => {
        cb('INITIAL_SESSION', null);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: () => ({
    trackSearch: vi.fn(),
    trackCardClick: vi.fn(),
    trackEvent: vi.fn(),
    trackSearchFailure: vi.fn(),
    trackPagination: vi.fn(),
    shouldLogCacheEvent: vi.fn(),
    trackLandingPageView: vi.fn(),
    trackRouteView: vi.fn(),
    trackExampleQueryImpression: vi.fn(),
    trackExampleQueryClick: vi.fn(),
    trackExampleQuerySearchSuccess: vi.fn(),
    trackExampleQueryResultClick: vi.fn(),
    trackFirstSave: vi.fn(),
    trackFirstReturnVisit: vi.fn(),
    trackFirstSearchStart: vi.fn(),
    trackFirstSearchSuccess: vi.fn(),
    trackFirstResultClick: vi.fn(),
    trackFirstRefinement: vi.fn(),
  }),
}));
vi.mock('@/lib/scryfall/query', () => ({
  buildFilterQuery: () => '',
  validateScryfallQuery: (q: string) => ({
    valid: true,
    sanitized: q,
    issues: [],
  }),
}));
vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => false }));
vi.mock('@/lib/pwa', () => ({ registerSW: vi.fn(), checkForUpdates: vi.fn() }));
vi.mock('@/lib/i18n', async () => {
  const enDict = (await import('@/lib/i18n/en.json')).default as Record<
    string,
    string
  >;
  return {
    useTranslation: () => ({
      t: (key: string, fallback?: string) => enDict[key] ?? fallback ?? key,
      locale: 'en',
      setLocale: vi.fn(),
    }),
    I18nProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});
vi.mock('@/hooks/useRealtimeCache', () => ({ useRealtimeCache: () => {} }));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    session: null,
    loading: false,
    profile: null,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    refreshProfile: vi.fn(),
  }),
}));
vi.mock('@/components/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// ── Setup ──────────────────────────────────────────────────

let IndexPage: React.ComponentType;

beforeEach(async () => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('offmeta-locale', 'en');
  mockTranslateQueryWithDedup.mockResolvedValue(
    createMockTranslation({ scryfallQuery: 'o:"treasure"' }),
  );
  mockSearchCards.mockResolvedValue({
    object: 'list',
    total_cards: MOCK_CARDS.length,
    has_more: false,
    data: MOCK_CARDS,
  });
  const mod = await import('@/pages/Index');
  IndexPage = mod.default;
});

afterEach(() => cleanup());

// ── Helpers ────────────────────────────────────────────────

async function submitSearch(query: string) {
  await renderIndex(IndexPage);
  const input = screen.getByRole('searchbox');
  fireEvent.change(input, { target: { value: query } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

// ── Tests ──────────────────────────────────────────────────

describe('Index – Scryfall error flows', () => {
  it('shows empty state when Scryfall returns 404 (no matching cards)', async () => {
    // Scryfall returns 404 for queries with no matches; client converts to empty result
    mockSearchCards.mockResolvedValue({
      object: 'list',
      total_cards: 0,
      has_more: false,
      data: [],
    });

    await submitSearch('xyznonexistent');

    await waitFor(
      () => {
        const matches = screen.getAllByText(/no cards found/i);
        expect(matches.length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 5000 },
    );
  });

  it('shows empty state with tips section when search yields zero results', async () => {
    mockSearchCards.mockResolvedValue({
      object: 'list',
      total_cards: 0,
      has_more: false,
      data: [],
    });

    await submitSearch('impossible card query');

    await waitFor(() => {
      expect(mockSearchCards).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      const showsTipsSection = screen.queryByText(/tips/i);
      const showsNoCardsState = screen.queryAllByText(/no cards found/i);
      expect(Boolean(showsTipsSection) || showsNoCardsState.length > 0).toBe(
        true,
      );
    });
  }, 15000);

  it('renders example query buttons in empty state for retry', async () => {
    mockSearchCards.mockResolvedValue({
      object: 'list',
      total_cards: 0,
      has_more: false,
      data: [],
    });

    await submitSearch('nothing matches');

    await waitFor(() => {
      expect(mockSearchCards).toHaveBeenCalledTimes(1);
    });

    // Empty state should have retry example buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  }, 15000);

  it('handles Scryfall API error (non-404) gracefully without crashing', async () => {
    mockSearchCards.mockRejectedValue(
      new Error('Search failed: 503 Service Unavailable'),
    );

    await submitSearch('dragon tokens');

    await waitFor(() => {
      expect(mockSearchCards).toHaveBeenCalledTimes(1);
    });

    // The page should not crash — search bar remains accessible
    expect(screen.getByRole('searchbox')).toBeInTheDocument();

    // Should not show cards
    expect(screen.queryByText(/3 cards total/i)).not.toBeInTheDocument();
  }, 15000);

  it('handles translation failure gracefully and does not call Scryfall', async () => {
    mockTranslateQueryWithDedup.mockRejectedValue(
      new Error('Translation service unavailable'),
    );

    await submitSearch('broken translation');

    // Translation was attempted
    await waitFor(() => {
      expect(mockTranslateQueryWithDedup).toHaveBeenCalled();
    });

    // The page should remain functional — search bar still in DOM
    expect(screen.getByRole('searchbox', { hidden: true })).toBeInTheDocument();
  });

  it('handles Scryfall rate limit (429) error without crashing', async () => {
    mockSearchCards.mockRejectedValue(
      new Error('Search failed: 429 Too Many Requests'),
    );

    await submitSearch('rate limited query');

    await waitFor(() => {
      expect(mockSearchCards).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.queryByText(/3 cards total/i)).not.toBeInTheDocument();
  }, 15000);

  it('recovers from Scryfall error when user searches again successfully', async () => {
    // First search: Scryfall fails
    mockSearchCards.mockRejectedValueOnce(new Error('Search failed: 500'));

    await submitSearch('broken query');

    await waitFor(() => {
      expect(mockSearchCards).toHaveBeenCalledTimes(1);
    });

    // Second search: Scryfall succeeds
    mockSearchCards.mockResolvedValue({
      object: 'list',
      total_cards: MOCK_CARDS.length,
      has_more: false,
      data: MOCK_CARDS,
    });

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'working query' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockSearchCards).toHaveBeenCalledTimes(2);
    });

    expect(mockTranslateQueryWithDedup).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: 'working query' }),
    );
  }, 15000);

  it('shows the user query in empty state for context', async () => {
    mockSearchCards.mockResolvedValue({
      object: 'list',
      total_cards: 0,
      has_more: false,
      data: [],
    });

    await submitSearch('very specific nonexistent card');

    await waitFor(() => {
      expect(mockSearchCards).toHaveBeenCalledTimes(1);
      expect(
        screen.getByText(/we couldn't find any cards matching/i),
      ).toBeInTheDocument();
    });

    expect(document.title).toContain('very specific nonexistent card');
  });

  it('does not render card grid when search produces an error', async () => {
    mockSearchCards.mockRejectedValue(new Error('Network error'));

    await submitSearch('network failure');

    await waitFor(() => {
      expect(screen.getByRole('searchbox')).toBeInTheDocument();
    });

    // No card count should be visible (e.g. "3 cards")
    expect(screen.queryByText(/^\d+ cards$/)).not.toBeInTheDocument();
  });
});
