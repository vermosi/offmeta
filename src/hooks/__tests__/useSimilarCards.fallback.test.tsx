/**
 * Integration tests: Similar tab loads correct results when the user query
 * compiles through buildClientFallbackQuery (i.e., natural language queries
 * that are not exact card names).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { ScryfallCard, SearchResult } from '@/types/card';

const getCardByName = vi.fn();
const searchCards = vi.fn();
const invoke = vi.fn();

vi.mock('@/lib/scryfall/client', () => ({
  getCardByName: (...args: unknown[]) => getCardByName(...args),
  searchCards: (...args: unknown[]) => searchCards(...args),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

vi.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ trackEvent: vi.fn() }),
}));

import { useSimilarCards } from '@/hooks/useSimilarCards';
import { buildClientFallbackQuery } from '@/lib/search/fallback';

function makeCard(name: string, overrides: Partial<ScryfallCard> = {}): ScryfallCard {
  return {
    id: `id-${name}`,
    oracle_id: `oid-${name}`,
    name,
    type_line: 'Creature — Human',
    oracle_text: 'Sample text',
    color_identity: ['G'],
    colors: ['G'],
    cmc: 2,
    prices: { usd: '1.00', usd_foil: null, eur: null, tix: null },
    image_uris: undefined,
    ...overrides,
  } as unknown as ScryfallCard;
}

function makeResult(cards: ScryfallCard[]): SearchResult {
  return { data: cards, has_more: false, total_cards: cards.length } as SearchResult;
}

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return React.createElement(QueryClientProvider, { client }, children);
};

describe('useSimilarCards + buildClientFallbackQuery integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Natural-language queries should NOT resolve to an exact card name.
    getCardByName.mockResolvedValue(null);
  });

  it('activates similarity using fallbackCard when NL query compiles via fallback (not an exact card name)', async () => {
    const naturalQuery = 'cheap green ramp creatures';
    const compiled = buildClientFallbackQuery(naturalQuery);
    expect(compiled).not.toEqual(`!"${naturalQuery.trim()}"`);
    expect(compiled.length).toBeGreaterThan(0);

    const firstResult = makeCard('Llanowar Elves');
    const similarCard = makeCard('Elvish Mystic');
    const budgetCard = makeCard('Fyndhorn Elves');

    invoke.mockResolvedValue({
      data: {
        success: true,
        similarQuery: 't:creature o:"add {g}"',
        budgetQuery: 't:creature o:"add {g}" usd<=1',
        synergyCards: [{ name: 'Priest of Titania', reason: 'Elf synergy' }],
      },
      error: null,
    });
    searchCards
      .mockResolvedValueOnce(makeResult([similarCard]))
      .mockResolvedValueOnce(makeResult([budgetCard]));

    const { result } = renderHook(
      () => useSimilarCards(naturalQuery, firstResult),
      { wrapper },
    );

    // Similar tab is inactive until user opens it.
    expect(result.current.similarityData).toBeUndefined();

    act(() => result.current.activate());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(invoke).toHaveBeenCalledWith(
      'card-similarity',
      expect.objectContaining({
        body: expect.objectContaining({ cardName: 'Llanowar Elves' }),
      }),
    );
    expect(searchCards).toHaveBeenCalledWith('t:creature o:"add {g}"', 1);
    expect(searchCards).toHaveBeenCalledWith('t:creature o:"add {g}" usd<=1', 1);

    const data = result.current.similarityData!;
    expect(data.sourceCard.name).toBe('Llanowar Elves');
    expect(data.similarResults?.data[0].name).toBe('Elvish Mystic');
    expect(data.budgetResults?.data[0].name).toBe('Fyndhorn Elves');
    expect(data.synergyCards).toHaveLength(1);
    expect(result.current.isDetected).toBe(true);
  });

  it('uses fallbackCard for strategy-hate style NL query that compiles via fallback', async () => {
    const naturalQuery = 'cards that punish treasure decks';
    const compiled = buildClientFallbackQuery(naturalQuery);
    // Strategy-hate layer must produce a non-trivial query, not `o:"treasure"`.
    expect(compiled).not.toEqual('o:"treasure"');
    expect(compiled.length).toBeGreaterThan(0);

    const firstResult = makeCard('Collector Ouphe');
    invoke.mockResolvedValue({
      data: {
        success: true,
        similarQuery: 'otag:artifact-hate',
        budgetQuery: null,
        synergyCards: [],
      },
      error: null,
    });
    searchCards.mockResolvedValueOnce(makeResult([makeCard('Null Rod')]));

    const { result } = renderHook(
      () => useSimilarCards(naturalQuery, firstResult),
      { wrapper },
    );
    act(() => result.current.activate());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getCardByName).not.toHaveBeenCalledWith(
      expect.stringMatching(/^!/), // never queried as an exact-name lookup
    );
    expect(result.current.similarityData?.sourceCard.name).toBe('Collector Ouphe');
    expect(result.current.similarityData?.similarResults?.data[0].name).toBe('Null Rod');
    expect(result.current.similarityData?.budgetResults).toBeNull();
  });

  it('returns null when NL query compiles via fallback but no fallbackCard is provided', async () => {
    const naturalQuery = 'cheap red burn spells';
    expect(buildClientFallbackQuery(naturalQuery).length).toBeGreaterThan(0);

    const { result } = renderHook(() => useSimilarCards(naturalQuery, null), {
      wrapper,
    });
    act(() => result.current.activate());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(invoke).not.toHaveBeenCalled();
    expect(searchCards).not.toHaveBeenCalled();
    expect(result.current.similarityData).toBeNull();
    expect(result.current.isDetected).toBe(false);
  });

  it('gracefully returns null when the similarity edge function fails', async () => {
    const naturalQuery = 'go wide token strategies';
    expect(buildClientFallbackQuery(naturalQuery).length).toBeGreaterThan(0);

    invoke.mockResolvedValue({
      data: { success: false, error: 'boom' },
      error: null,
    });

    const { result } = renderHook(
      () => useSimilarCards(naturalQuery, makeCard('Anointed Procession')),
      { wrapper },
    );
    act(() => result.current.activate());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.similarityData).toBeNull();
    expect(searchCards).not.toHaveBeenCalled();
  });
});
