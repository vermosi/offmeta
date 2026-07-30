import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PublicProfile from '@/pages/PublicProfile';
import type * as ReactRouterDom from 'react-router-dom';

const queryState = vi.hoisted(() => ({
  profileError: null as Error | null,
  decksError: null as Error | null,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        order: async () => {
          if (table === 'decks' && queryState.decksError) {
            return { data: null, error: queryState.decksError };
          }
          return { data: [], error: null };
        },
        single: async () => {
          if (table === 'profiles' && queryState.profileError) {
            return { data: null, error: queryState.profileError };
          }
          return {
            data: {
              id: 'user-1',
              display_name: 'Alex',
              avatar_url: null,
              created_at: '2024-01-01T00:00:00.000Z',
            },
            error: null,
          };
        },
      };
      return chain;
    },
  },
}));

vi.mock('@/components/Header', () => ({
  Header: () => <div data-testid="header" />,
}));

vi.mock('@/components/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

vi.mock('@/components/SkipLinks', () => ({
  SkipLinks: () => null,
}));

vi.mock('@/components/profile/PublicCollectionStats', () => ({
  PublicCollectionStats: () => <div data-testid="collection-stats" />,
}));

vi.mock('@/components/ManaSymbol', () => ({
  ManaCost: () => <span data-testid="mana-cost" />,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div className={className} />
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ userId: 'user-1' }),
  };
});

describe('PublicProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryState.profileError = null;
    queryState.decksError = null;
  });

  it('shows a retryable profile error when the profile query fails', async () => {
    queryState.profileError = new Error('profile load failed');
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/user/user-1']}>
          <Routes>
            <Route path="/user/:userId" element={<PublicProfile />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText(/Failed to load this profile/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /retry/i }).length,
    ).toBeGreaterThan(0);
  });

});
