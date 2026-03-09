/**
 * Shared fixtures and render helper for Index page integration tests.
 * vi.mock() calls MUST remain in each test file (Vitest hoists them per-file).
 * @module pages/__tests__/index-test-setup
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import { Suspense } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { createMockCard } from '@/test/factories';
import type { ScryfallCard } from '@/types/card';

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

export async function renderIndex(
  IndexPage: React.ComponentType,
  initialRoute = '/',
) {
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
