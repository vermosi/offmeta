/**
 * Tests for useDeckPrice hook.
 * Focuses on price calculation and fetch logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDeckPrice } from '@/hooks/useDeckPrice';
import type { DeckCard } from '@/hooks/useDeck';
import type { ScryfallCard } from '@/types/card';
import { createRef } from 'react';

// Mock local-cards service to avoid supabase dependency in tests
vi.mock('@/services/local-cards', () => ({
  getLocalPrices: vi.fn().mockResolvedValue(new Map()),
}));

const makeDeckCard = (name: string, qty: number): DeckCard => ({
  id: `dc-${name}`,
  deck_id: 'deck-1',
  card_name: name,
  quantity: qty,
  board: 'mainboard',
  category: null,
  is_commander: false,
  is_companion: false,
  scryfall_id: null,
  created_at: '',
});

const makeScryfallCard = (name: string, usd: string): ScryfallCard =>
  ({ name, prices: { usd } } as unknown as ScryfallCard);

describe('useDeckPrice', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null total for empty deck', async () => {
    const cache = createRef<Map<string, ScryfallCard>>() as React.RefObject<Map<string, ScryfallCard>>;
    (cache as { current: Map<string, ScryfallCard> }).current = new Map();
    const onUpdate = vi.fn();

    const { result } = renderHook(() => useDeckPrice([], cache, onUpdate));

    await waitFor(() => {
      expect(result.current.total).toBeNull();
    });
    expect(result.current.loading).toBe(false);
  });

  it('calculates total from cached prices', async () => {
    const cache = createRef<Map<string, ScryfallCard>>() as React.RefObject<Map<string, ScryfallCard>>;
    (cache as { current: Map<string, ScryfallCard> }).current = new Map([
      ['Lightning Bolt', makeScryfallCard('Lightning Bolt', '1.50')],
      ['Counterspell', makeScryfallCard('Counterspell', '2.00')],
    ]);
    const onUpdate = vi.fn();

    // Mock fetch so it won't be called (all cached)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));

    const cards = [
      makeDeckCard('Lightning Bolt', 4),
      makeDeckCard('Counterspell', 2),
    ];

    const { result } = renderHook(() => useDeckPrice(cards, cache, onUpdate));

    await waitFor(() => {
      expect(result.current.total).toBe(4 * 1.5 + 2 * 2.0); // 10.0
    });
  });

  it('handles cards with no price gracefully', async () => {
    const cache = createRef<Map<string, ScryfallCard>>() as React.RefObject<Map<string, ScryfallCard>>;
    (cache as { current: Map<string, ScryfallCard> }).current = new Map([
      ['Token Card', { name: 'Token Card', prices: {} } as unknown as ScryfallCard],
    ]);
    const onUpdate = vi.fn();

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));

    const { result } = renderHook(() =>
      useDeckPrice([makeDeckCard('Token Card', 1)], cache, onUpdate),
    );

    await waitFor(() => {
      expect(result.current.total).toBe(0);
    });
  });

  it('fetches uncached cards from Scryfall collection API', async () => {
    const cache = createRef<Map<string, ScryfallCard>>() as React.RefObject<Map<string, ScryfallCard>>;
    (cache as { current: Map<string, ScryfallCard> }).current = new Map();
    const onUpdate = vi.fn();

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ name: 'Sol Ring', prices: { usd: '3.00' } }],
        }),
        { status: 200 },
      ),
    );

    const { result } = renderHook(() =>
      useDeckPrice([makeDeckCard('Sol Ring', 1)], cache, onUpdate),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.scryfall.com/cards/collection',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.current.total).toBe(3.0);
  });

  it('swallows fetch errors gracefully', async () => {
    const cache = createRef<Map<string, ScryfallCard>>() as React.RefObject<Map<string, ScryfallCard>>;
    (cache as { current: Map<string, ScryfallCard> }).current = new Map();
    const onUpdate = vi.fn();

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useDeckPrice([makeDeckCard('Foo', 1)], cache, onUpdate),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    // Should not throw — error is swallowed
  });
});
