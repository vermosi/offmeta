/**
 * Tests for the Find My Combos page.
 * Covers rendering and Moxfield import flow behavior.
 * @module FindMyCombos.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/components/AuthProvider';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: (_cb: unknown) => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: null }) }),
      }),
    }),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('@/components/ThemeToggle', () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Toggle</button>,
}));

vi.mock('@/components/NotificationBell', () => ({
  NotificationBell: () => null,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

async function renderPage() {
  const { default: FindMyCombos } = await import('@/pages/FindMyCombos');
  const result = render(
    <MemoryRouter initialEntries={['/combos']}>
      <AuthProvider>
        <FindMyCombos />
      </AuthProvider>
    </MemoryRouter>,
  );
  await waitFor(() => {});
  return result;
}

describe('FindMyCombos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the page heading', async () => {
    await renderPage();
    expect(await screen.findByText('Find My Combos', {}, { timeout: 10000 })).toBeInTheDocument();
  }, 15000);

  it('renders Commander Spellbook attribution', async () => {
    await renderPage();
    const links = screen.getAllByText('Commander Spellbook');
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  it('defaults to Moxfield URL input mode', async () => {
    await renderPage();
    expect(
      screen.getByPlaceholderText(/moxfield\.com\/decks/i),
    ).toBeInTheDocument();
  });

  it('shows Deck Summary with empty state prompt', async () => {
    await renderPage();
    expect(screen.getByText('Deck Summary')).toBeInTheDocument();
    expect(
      screen.getByText(/Import a Moxfield deck to get started/i),
    ).toBeInTheDocument();
  });

  it('disables import button when URL is empty', async () => {
    await renderPage();
    const btn = screen.getByRole('button', { name: /Import from Moxfield/i });
    expect(btn).toBeDisabled();
  });

  it('shows the deck summary empty state when no deck is imported', async () => {
    await renderPage();
    expect(screen.getByText('Deck Summary')).toBeInTheDocument();
    expect(
      screen.getByText(/Import a Moxfield deck to get started/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Find My Combos/i }),
    ).not.toBeInTheDocument();
  });
});
