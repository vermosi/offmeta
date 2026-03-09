/**
 * Shared mocks, helpers, and setup for Index page integration tests.
 * Each focused test file imports from here to avoid duplication.
 * @module pages/__tests__/index-test-setup
 */

import { vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import { Suspense } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { createMockCard, createMockTranslation } from '@/test/factories';
import type { ScryfallCard } from '@/types/card';

// ── Mock handles (exported for per-test overrides) ─────────

export const mockTranslateQueryWithDedup = vi.fn();
export const mockSearchCards = vi.fn();

// ── Module mocks ───────────────────────────────────────────

vi.mock('@/hooks/useSearchQuery', () => ({
  translateQueryWithDedup: (...args: unknown[]) =>
    mockTranslateQueryWithDedup(...args),
  usePrefetchPopularQueries: () => {},
  useTranslateQuery: () => ({ data: null, isLoading: false }),
  useSubmitFeedback: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

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

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: () => ({
    trackSearch: vi.fn(),
    trackCardClick: vi.fn(),
    trackEvent: vi.fn(),
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

vi.mock('@/hooks/useMobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/lib/pwa', () => ({
  registerSW: vi.fn(),
  checkForUpdates: vi.fn(),
}));

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

vi.mock('@/hooks/useRealtimeCache', () => ({
  useRealtimeCache: () => {},
}));

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

// ── Shared fixtures ────────────────────────────────────────

export const MOCK_CARDS: ScryfallCard[] = [
  createMockCard({
    id: 'card-1',
    name: 'Dockside Extortionist',
    type_line: 'Creature — Goblin Pirate',
  }),
  createMockCard({
    id: 'card-2',
    name: 'Smothering Tithe',
    type_line: 'Enchantment',
  }),
  createMockCard({
    id: 'card-3',
    name: 'Treasure Vault',
    type_line: 'Artifact Land',
  }),
];

// ── Render helper ──────────────────────────────────────────

let IndexPage: React.ComponentType;

export async function renderIndex(initialRoute = '/') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MemoryRouter initialEntries={[initialRoute]}>
            <Suspense fallback={<div>Loading…</div>}>
              <IndexPage />
            </Suspense>
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>,
    );
  });

  await waitFor(() => {
    expect(screen.getByRole('search')).toBeInTheDocument();
  });

  return result!;
}

// ── Shared lifecycle ───────────────────────────────────────

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

afterEach(() => {
  cleanup();
});
