/**
 * Fetches estimated USD prices for mainboard cards via Scryfall /cards/collection.
 * Uses the shared Scryfall ref-cache so cards already previewed cost nothing.
 * Returns { total, loading } where total is null until prices are loaded.
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

  // Stable key: sorted card names + quantities
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
        const uncached = mainboardCards
          .map((c) => c.card_name)
          .filter((name) => !scryfallCache.current?.has(name));

        if (uncached.length > 0) {
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
