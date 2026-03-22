/**
 * Integration tests: Empty state when no results are returned.
 * @module pages/__tests__/Index.empty-state.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  screen,
  fireEvent,
  waitFor,
  act,
  cleanup,
} from '@testing-library/react';
import { createMockTranslation } from '@/test/factories';
import { renderIndex, MOCK_CARDS } from './index-test-setup';

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

// ── Tests ──────────────────────────────────────────────────

describe('Index – empty state', () => {
  it('shows empty state when no results are returned', async () => {
    mockSearchCards.mockResolvedValue({
      object: 'list',
      total_cards: 0,
      has_more: false,
      data: [],
    });

    await renderIndex(IndexPage);
    const input = screen.getByRole('searchbox');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'nonexistent card xyz' } });
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    await waitFor(() => {
      const matches = screen.getAllByText(/no cards found/i);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });
});
