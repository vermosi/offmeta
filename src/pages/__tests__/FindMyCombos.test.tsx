/**
 * Tests for the Find My Combos page.
 * Covers rendering and Moxfield import flow behavior.
 * @module FindMyCombos.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    expect(screen.getByText('Find My Combos')).toBeInTheDocument();
  });

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

  it('parses imported Moxfield decklist and shows card count', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: {
        decklist: 'COMMANDER: Kenrith\n1 Sol Ring\n1 Arcane Signet',
        deckName: 'Five Color Test',
        colorIdentity: ['W', 'U', 'B', 'R', 'G'],
        cardCount: 2,
      },
      error: null,
    });
    await renderPage();
    fireEvent.change(screen.getByPlaceholderText(/moxfield\.com\/decks/i), {
      target: { value: 'https://www.moxfield.com/decks/test-deck' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /Import from Moxfield/i }),
    );

    await waitFor(() =>
      expect(screen.getByText(/Imported:/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/Cards:/i)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows Find My Combos button after importing', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: {
        decklist: '1 Sol Ring',
        deckName: 'Artifact Test',
        colorIdentity: [],
        cardCount: 1,
      },
      error: null,
    });
    await renderPage();
    fireEvent.change(screen.getByPlaceholderText(/moxfield\.com\/decks/i), {
      target: { value: 'https://www.moxfield.com/decks/artifacts' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /Import from Moxfield/i }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Find My Combos/i }),
      ).toBeInTheDocument(),
    );
  });
});
