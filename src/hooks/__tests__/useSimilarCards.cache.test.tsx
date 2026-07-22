import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useSimilarCards, __clearSimilarityCache } from '../useSimilarCards';
import { supabase } from '@/integrations/supabase/client';
import { searchCards } from '@/lib/scryfall/client';
import type { ScryfallCard } from '@/types/card';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));
vi.mock('@/lib/scryfall/client', () => ({
  getCardByName: vi.fn(async () => null),
  searchCards: vi.fn(async () => ({ data: [], has_more: false, total_cards: 0 })),
}));
vi.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ trackEvent: vi.fn() }),
}));

const invokeMock = supabase.functions.invoke as unknown as ReturnType<typeof vi.fn>;
const searchMock = searchCards as unknown as ReturnType<typeof vi.fn>;

const fallback: ScryfallCard = {
  id: 'card-1',
  name: 'Collector Ouphe',
  type_line: 'Creature — Elf Druid',
  oracle_text: 'Activated abilities of artifacts cannot be activated.',
  color_identity: ['G'],
  cmc: 2,
  prices: { usd: '5.00' },
} as unknown as ScryfallCard;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  __clearSimilarityCache();
  invokeMock.mockResolvedValue({
    data: {
      success: true,
      similarQuery: 'o:artifact',
      budgetQuery: 'usd<1',
      synergyCards: [],
    },
    error: null,
  });
});

describe('useSimilarCards — debounce + cache', () => {
  it('debounces rapid query changes into a single edge invocation', async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ q }) => useSimilarCards(q, fallback),
      { wrapper, initialProps: { q: 'a' } },
    );

    // Rapid typing before activation.
    rerender({ q: 'ab' });
    rerender({ q: 'abc' });
    rerender({ q: 'abcd' });

    act(() => {
      vi.advanceTimersByTime(400);
    });
    // Activate after debounce settles so only the final query fires.
    act(() => result.current.activate());
    vi.useRealTimers();

    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
  });

  it('serves repeated queries from the in-memory cache', async () => {
    const { result, unmount } = renderHook(
      () => useSimilarCards('collector ouphe', fallback),
      { wrapper },
    );
    act(() => result.current.activate());
    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
    unmount();

    // Second mount with identical inputs must not hit the edge function
    // again — the cache short-circuits before invoke().
    const second = renderHook(
      () => useSimilarCards('collector ouphe', fallback),
      { wrapper },
    );
    act(() => second.result.current.activate());
    await waitFor(() =>
      expect(second.result.current.similarityData?.sourceCard.id).toBe('card-1'),
    );
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(searchMock).toHaveBeenCalled();
  });

  it('does not cache failed lookups so retries can succeed', async () => {
    invokeMock.mockResolvedValueOnce({
      data: { success: false, error: 'boom' },
      error: null,
    });

    const first = renderHook(() => useSimilarCards('mystery', fallback), { wrapper });
    act(() => first.result.current.activate());
    await waitFor(() =>
      expect(first.result.current.similarityData).toBeNull(),
    );
    first.unmount();

    const second = renderHook(() => useSimilarCards('mystery', fallback), { wrapper });
    act(() => second.result.current.activate());
    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(2));
  });
});
