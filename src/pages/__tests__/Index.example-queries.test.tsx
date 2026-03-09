/**
 * Integration tests: Example query buttons trigger search.
 * @module pages/__tests__/Index.example-queries.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { createMockTranslation } from '@/test/factories';
import { renderIndex, MOCK_CARDS } from './index-test-setup';

// ── Mocks ──────────────────────────────────────────────────

const mockTranslateQueryWithDedup = vi.fn();
vi.mock('@/hooks/useSearchQuery', () => ({
  translateQueryWithDedup: (...args: unknown[]) => mockTranslateQueryWithDedup(...args),
  usePrefetchPopularQueries: () => {},
  useTranslateQuery: () => ({ data: null, isLoading: false }),
  useSubmitFeedback: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const mockSearchCards = vi.fn();
vi.mock('@/lib/scryfall/client', async () => {
  const actual = await vi.importActual('@/lib/scryfall/client');
  return { ...actual, searchCards: (...args: unknown[]) => mockSearchCards(...args) };
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
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ trackSearch: vi.fn(), trackCardClick: vi.fn(), trackEvent: vi.fn() }),
}));
vi.mock('@/lib/scryfall/query', () => ({
  buildFilterQuery: () => '',
  validateScryfallQuery: (q: string) => ({ valid: true, sanitized: q, issues: [] }),
}));
vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => false }));
vi.mock('@/lib/pwa', () => ({ registerSW: vi.fn(), checkForUpdates: vi.fn() }));
vi.mock('@/lib/i18n', async () => {
  const enDict = (await import('@/lib/i18n/en.json')).default as Record<string, string>;
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
    user: null, session: null, loading: false, profile: null,
    signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn(),
    resetPassword: vi.fn(), updatePassword: vi.fn(), refreshProfile: vi.fn(),
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
    object: 'list', total_cards: MOCK_CARDS.length, has_more: false, data: MOCK_CARDS,
  });
  const mod = await import('@/pages/Index');
  IndexPage = mod.default;
});

afterEach(() => cleanup());

// ── Tests ──────────────────────────────────────────────────

describe('Index – example queries', () => {
  it('renders example query buttons when no search has been made', async () => {
    await renderIndex(IndexPage);
    expect(
      screen.getByRole('group', { name: /try searching for/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('creatures that make treasure tokens'),
    ).toBeInTheDocument();
  });

  it('clicking an example query triggers search', async () => {
    await renderIndex(IndexPage);
    const exampleBtn = screen.getByText('creatures that make treasure tokens');
    await act(async () => {
      fireEvent.click(exampleBtn);
    });

    await waitFor(() => {
      expect(mockTranslateQueryWithDedup).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'creatures that make treasure tokens',
        }),
      );
    });
  });
});
