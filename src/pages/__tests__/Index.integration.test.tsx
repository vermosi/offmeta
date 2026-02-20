/**
 * Integration tests for the Index (home) page.
 * Validates the full search flow from user input through to card display.
 * All external calls are mocked at module boundaries.
 * @module pages/__tests__/Index.integration.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { createMockCard, createMockTranslation } from '@/test/factories';
import type { ScryfallCard } from '@/types/card';

// ── Mocks ──────────────────────────────────────────────────

const mockTranslateQueryWithDedup = vi.fn();
vi.mock('@/hooks/useSearchQuery', () => ({
  translateQueryWithDedup: (...args: unknown[]) =>
    mockTranslateQueryWithDedup(...args),
  usePrefetchPopularQueries: () => {},
  useTranslateQuery: () => ({ data: null, isLoading: false }),
  useSubmitFeedback: () => ({ mutateAsync: vi.fn(), isPending: false }),
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

// ── Helpers ────────────────────────────────────────────────

const MOCK_CARDS: ScryfallCard[] = [
  createMockCard({ id: 'card-1', name: 'Dockside Extortionist', type_line: 'Creature — Goblin Pirate' }),
  createMockCard({ id: 'card-2', name: 'Smothering Tithe', type_line: 'Enchantment' }),
  createMockCard({ id: 'card-3', name: 'Treasure Vault', type_line: 'Artifact Land' }),
];

function renderIndex(initialRoute = '/') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <IndexPage />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

// Lazy import after mocks
let IndexPage: React.ComponentType;

beforeEach(async () => {
  vi.clearAllMocks();
  mockTranslateQueryWithDedup.mockResolvedValue(
    createMockTranslation({ scryfallQuery: 'o:"treasure"' }),
  );
  mockSearchCards.mockResolvedValue({
    object: 'list',
    total_cards: MOCK_CARDS.length,
    has_more: false,
    data: MOCK_CARDS,
  });

  // Dynamic import to ensure mocks are in place
  const mod = await import('@/pages/Index');
  IndexPage = mod.default;
});

// ── Tests ──────────────────────────────────────────────────

describe('Index page integration', () => {
  it('renders hero section and search bar on initial load', () => {
    renderIndex();
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('renders example query buttons when no search has been made', () => {
    renderIndex();
    expect(
      screen.getByRole('group', { name: /try searching for/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('creatures that make treasure tokens'),
    ).toBeInTheDocument();
  });

  it('displays skeleton loaders while searching', async () => {
    // Make translation hang to keep loading state
    mockTranslateQueryWithDedup.mockImplementation(
      () => new Promise(() => {}),
    );

    renderIndex();

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'treasure makers' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // The search bar should enter a loading state
    await waitFor(() => {
      expect(screen.getByLabelText('Searching...')).toBeInTheDocument();
    });
  });

  it('renders card results after successful search flow', async () => {
    renderIndex();

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'treasure makers' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // Wait for cards to appear
    await waitFor(() => {
      expect(screen.getByText('Dockside Extortionist')).toBeInTheDocument();
    });
    expect(screen.getByText('Smothering Tithe')).toBeInTheDocument();
    expect(screen.getByText('Treasure Vault')).toBeInTheDocument();
  });

  it('shows empty state when no results are returned', async () => {
    mockSearchCards.mockResolvedValue({
      object: 'list',
      total_cards: 0,
      has_more: false,
      data: [],
    });

    renderIndex();

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'nonexistent card xyz' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      // EmptyState renders an h3 with "No cards found"
      const matches = screen.getAllByText(/no cards found/i);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('clicking an example query triggers search', async () => {
    renderIndex();

    const exampleBtn = screen.getByText('creatures that make treasure tokens');
    fireEvent.click(exampleBtn);

    await waitFor(() => {
      expect(mockTranslateQueryWithDedup).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'creatures that make treasure tokens',
        }),
      );
    });
  });

  it('shows total cards count after search', async () => {
    renderIndex();

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'treasure' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('3 cards')).toBeInTheDocument();
    });
  });
});
