import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CardsLikePage from '@/pages/CardsLikePage';

const trackEvent = vi.fn();
const getCardByName = vi.fn();

const similarityData = {
  sourceCard: {
    id: 'card-1',
    name: 'Rhystic Study',
    type_line: 'Enchantment',
    oracle_text: 'Whenever an opponent casts a spell, you may draw a card.',
    color_identity: ['U'],
    cmc: 3,
    prices: {},
  },
  similarResults: { data: [{ id: 'card-2' }] },
  budgetResults: { data: [{ id: 'card-3' }] },
};

// The page renders the shared Header, which reads auth context.
vi.mock('@/components/Header', () => ({
  Header: () => <header data-testid="header" />,
}));

vi.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ trackEvent }),
}));

vi.mock('@/hooks/useSimilarCards', () => ({
  useSimilarCards: (query: string) => ({
    similarityData: query ? similarityData : null,
    isLoading: false,
    errorMessage: null,
  }),
}));

vi.mock('@/lib/scryfall/client', () => ({
  getCardByName: (...args: unknown[]) => (getCardByName as (...a: unknown[]) => Promise<unknown>)(...args),
}));

vi.mock('@/components/SimilarCardsPanel', () => ({
  SimilarCardsPanel: ({ data }: { data: { similarResults?: { data: unknown[] }; budgetResults?: { data: unknown[] } } | null }) => (
    <div data-testid="similar-panel">
      {(data?.similarResults?.data.length ?? 0) + (data?.budgetResults?.data.length ?? 0)}
    </div>
  ),
}));

describe('CardsLikePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    getCardByName.mockResolvedValue({
      id: 'card-1',
      name: 'Rhystic Study',
      type_line: 'Enchantment',
      oracle_text: 'Whenever an opponent casts a spell, you may draw a card.',
      color_identity: ['U'],
      cmc: 3,
      prices: {},
      set: 'cmm',
      rarity: 'rare',
    });
  });

  function renderPage(path = '/cards-like') {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/cards-like" element={<CardsLikePage />} />
          <Route path="/cards-like/:cardSlug" element={<CardsLikePage />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('renders the dedicated cards-like landing page', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { name: /search a card, see similar cards, and move on\./i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/search for a magic card/i)).toBeInTheDocument();
  });

  it('runs a successful cards-like search and emits the conversion event', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/search for a magic card/i), {
      target: { value: 'Rhystic Study' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /find similar cards/i }));

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith(
        'cards_like_search_completed',
        expect.objectContaining({
          searched_card_name: 'Rhystic Study',
          searched_card_id: 'card-1',
          result_count: 2,
          paid_search: false,
        }),
      );
    });
  });

  it('includes attribution data when present', async () => {
    sessionStorage.setItem(
      'offmeta_utm',
      JSON.stringify({
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'cards-like-test',
        utm_term: 'cards like mtg',
        gclid: 'test-gclid',
      }),
    );

    renderPage();
    fireEvent.change(screen.getByLabelText(/search for a magic card/i), {
      target: { value: 'Rhystic Study' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /find similar cards/i }));

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith(
        'cards_like_search_completed',
        expect.objectContaining({
          acquisition_source: 'google',
          acquisition_campaign: 'cards-like-test',
          acquisition_term: 'cards like mtg',
          gclid: 'test-gclid',
          paid_search: true,
        }),
      );
    });
  });

  it('does not double-fire the conversion on rerender', async () => {
    const view = renderPage();
    fireEvent.change(screen.getByLabelText(/search for a magic card/i), {
      target: { value: 'Rhystic Study' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /find similar cards/i }));

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledTimes(1);
    });

    view.rerender(
      <MemoryRouter initialEntries={['/cards-like']}>
        <Routes>
          <Route path="/cards-like" element={<CardsLikePage />} />
          <Route path="/cards-like/:cardSlug" element={<CardsLikePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(trackEvent).toHaveBeenCalledTimes(1);
  });

  it('fires second-search conversion on a later successful search in the same session', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/search for a magic card/i), {
      target: { value: 'Rhystic Study' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /find similar cards/i }));

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith(
        'cards_like_search_completed',
        expect.any(Object),
      );
    });

    vi.clearAllMocks();

    renderPage('/cards-like/sol-ring');

    await waitFor(() => {
      expect(trackEvent).toHaveBeenCalledWith(
        'cards_like_second_search',
        expect.objectContaining({
          searched_card_name: 'Rhystic Study',
        }),
      );
    });
  });
});
