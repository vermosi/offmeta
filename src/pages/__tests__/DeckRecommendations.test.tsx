/**
 * Tests for the Deck Recommendations page.
 * Covers rendering and Moxfield import flow behavior.
 * @module DeckRecommendations.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/components/AuthProvider';

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
  const { default: DeckRecommendations } =
    await import('@/pages/DeckRecommendations');
  const result = render(
    <MemoryRouter initialEntries={['/deck-recs']}>
      <AuthProvider>
        <DeckRecommendations />
      </AuthProvider>
    </MemoryRouter>,
  );
  await waitFor(() => {});
  return result;
}

describe('DeckRecommendations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the page heading', async () => {
    await renderPage();
    expect(screen.getByText('Deck Recommendations')).toBeInTheDocument();
  });

  it('defaults to Moxfield URL input mode', async () => {
    await renderPage();
    expect(
      screen.getByPlaceholderText(/moxfield\.com\/decks/i),
    ).toBeInTheDocument();
  });

  it('shows Parsed Summary placeholder', async () => {
    await renderPage();
    expect(screen.getByText('Parsed Summary')).toBeInTheDocument();
    expect(
      screen.getByText(/Import a Moxfield deck to see its summary/i),
    ).toBeInTheDocument();
  });

  it('disables import button when URL is empty', async () => {
    await renderPage();
    const btn = screen.getByRole('button', { name: /Import from Moxfield/i });
    expect(btn).toBeDisabled();
  });

  it('parses imported Moxfield decklist and shows summary', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: {
        decklist:
          'COMMANDER: Omnath, Locus of Creation\n1 Sol Ring\n1 Arcane Signet\n1 Island',
        deckName: 'Elemental Value',
        colorIdentity: ['W', 'U', 'R', 'G'],
        cardCount: 3,
      },
      error: null,
    });
    await renderPage();
    fireEvent.change(screen.getByPlaceholderText(/moxfield\.com\/decks/i), {
      target: { value: 'https://www.moxfield.com/decks/elemental-value' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /Import from Moxfield/i }),
    );

    await waitFor(() =>
      expect(screen.getByText(/Imported:/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/Total cards:/i)).toBeInTheDocument();
    expect(screen.getByText(/Unique cards:/i)).toBeInTheDocument();
  });

  it('shows Get Recommendations button after importing', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: {
        decklist: '1 Sol Ring',
        deckName: 'Artifact Shell',
        colorIdentity: [],
        cardCount: 1,
      },
      error: null,
    });
    await renderPage();
    fireEvent.change(screen.getByPlaceholderText(/moxfield\.com\/decks/i), {
      target: { value: 'https://www.moxfield.com/decks/artifact-shell' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /Import from Moxfield/i }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Get Recommendations/i }),
      ).toBeInTheDocument(),
    );
  });
});
