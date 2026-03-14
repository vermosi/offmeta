/**
 * Fetches estimated USD prices for mainboard cards.
 * Uses local price_snapshots first, falls back to Scryfall collection endpoint.
 *
 * @module hooks/useDeckPrice
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import type { DeckCard } from '@/hooks/useDeck';
import type { ScryfallCard } from '@/types/card';
import { getLocalPrices } from '@/services/local-cards';

export function useDeckPrice(
  mainboardCards: DeckCard[],
  scryfallCache: React.RefObject<Map<string, ScryfallCard>>,
  onCacheUpdated: () => void,
): { total: number | null; loading: boolean } {
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const onCacheUpdatedRef = useRef(onCacheUpdated);
  onCacheUpdatedRef.current = onCacheUpdated;

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
        const cardNames = mainboardCards.map((c) => c.card_name);

        // Try local prices first
        const localPrices = await getLocalPrices(cardNames);

        // Find cards not in local prices AND not in scryfall cache
        const uncached = cardNames.filter(
          (name) => !localPrices.has(name) && !scryfallCache.current?.has(name),
        );

        // Fetch missing from Scryfall
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
          // Check local price first
          const localPrice = localPrices.get(deckCard.card_name);
          if (localPrice?.price_usd) {
            sum += localPrice.price_usd * deckCard.quantity;
            continue;
          }

          // Fall back to scryfall cache
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
