/**
 * Fetches estimated USD prices for mainboard cards via the Scryfall
 * `/cards/collection` endpoint (up to 75 names per request).
 *
 * Uses the shared Scryfall ref-cache (`scryfallCache`) so cards already
 * previewed or loaded elsewhere cost zero additional network requests.
 * When new cards are fetched, `onCacheUpdated()` is called so the parent
 * component can bump a version counter and re-render dependent UI.
 *
 * Returns:
 * - `total`   — sum of (quantity × USD price) for all mainboard cards, or
 *               `null` if the deck is empty or prices are still loading.
 * - `loading` — true while any Scryfall request is in flight.
 *
 * Price fetch failures are silently swallowed — the price estimate is
 * non-critical and should never surface an error to the user.
 *
 * @module hooks/useDeckPrice
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import type { DeckCard } from '@/hooks/useDeck';
import type { ScryfallCard } from '@/types/card';

export function useDeckPrice(
  mainboardCards: DeckCard[],
  scryfallCache: React.RefObject<Map<string, ScryfallCard>>,
  onCacheUpdated: () => void,
): { total: number | null; loading: boolean } {
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  // Keep a stable ref to onCacheUpdated so it doesn't retrigger the effect
  const onCacheUpdatedRef = useRef(onCacheUpdated);
  onCacheUpdatedRef.current = onCacheUpdated;

  // Stable key: sorted card names + quantities — only re-runs when the deck changes
  const cacheKey = useMemo(
    () => mainboardCards.map((c) => `${c.card_name}:${c.quantity}`).sort().join('|'),
    [mainboardCards],
  );

  useEffect(() => {
    if (mainboardCards.length === 0) { setTotal(null); return; }
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        // Only fetch cards not already in the ref-cache
        const uncached = mainboardCards
          .map((c) => c.card_name)
          .filter((name) => !scryfallCache.current?.has(name));

        if (uncached.length > 0) {
          // Scryfall collection API accepts max 75 identifiers per request
          const chunks: string[][] = [];
          for (let i = 0; i < uncached.length; i += 75) chunks.push(uncached.slice(i, i + 75));
          for (const chunk of chunks) {
            const res = await fetch('https://api.scryfall.com/cards/collection', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ identifiers: chunk.map((name) => ({ name })) }),
            });
            if (!res.ok) continue;
            const json = await res.json();
            for (const card of (json.data ?? [])) {
              scryfallCache.current?.set(card.name, card);
            }
          }
          if (!cancelled) onCacheUpdatedRef.current();
        }

        if (cancelled) return;

        let sum = 0;
        for (const deckCard of mainboardCards) {
          const sc = scryfallCache.current?.get(deckCard.card_name);
          const price = parseFloat(sc?.prices?.usd ?? '');
          if (!isNaN(price)) sum += price * deckCard.quantity;
        }
        setTotal(sum);
      } catch (err) {
        void err; // swallow — price fetch failure is non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  return { total, loading };
}
