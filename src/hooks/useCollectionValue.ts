/**
 * Hook for collection value estimation and set tracking.
 * Resolves prices via Scryfall /cards/collection endpoint.
 * @module hooks/useCollectionValue
 */

import { useQuery } from '@tanstack/react-query';
import { useCollection, type CollectionCard } from '@/hooks/useCollection';

interface ScryfallCardPrice {
  name: string;
  prices: { usd: string | null; usd_foil: string | null };
  set: string;
  set_name: string;
  rarity: string;
  color_identity: string[];
}

export interface CollectionValueData {
  totalValue: number;
  cardPrices: Map<string, number>;
  byRarity: Record<string, { count: number; value: number }>;
  byColor: Record<string, { count: number; value: number }>;
  setCompletion: SetCompletionEntry[];
  missingPriceCount: number;
}

export interface SetCompletionEntry {
  setCode: string;
  setName: string;
  ownedCount: number;
  /** We don't know set totals client-side, so we just show owned count */
}

const BATCH_SIZE = 75;

async function fetchPrices(
  cards: CollectionCard[],
): Promise<ScryfallCardPrice[]> {
  const all: ScryfallCardPrice[] = [];

  for (let i = 0; i < cards.length; i += BATCH_SIZE) {
    const batch = cards.slice(i, i + BATCH_SIZE);
    const identifiers = batch.map((c) =>
      c.scryfall_id ? { id: c.scryfall_id } : { name: c.card_name },
    );

    try {
      const resp = await fetch('https://api.scryfall.com/cards/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifiers }),
      });

      if (resp.ok) {
        const data = await resp.json();
        for (const card of data.data ?? []) {
          all.push({
            name: card.name,
            prices: card.prices ?? {},
            set: card.set ?? '',
            set_name: card.set_name ?? '',
            rarity: card.rarity ?? 'common',
            color_identity: card.color_identity ?? [],
          });
        }
      }

      // Rate limit respect
      if (i + BATCH_SIZE < cards.length) {
        await new Promise((r) => setTimeout(r, 50));
      }
    } catch {
      // Continue on errors
    }
  }

  return all;
}

const COLOR_LABELS: Record<string, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
};

export function useCollectionValue() {
  const { data: collection = [] } = useCollection();

  return useQuery<CollectionValueData>({
    queryKey: [
      'collection-value',
      collection.length,
      collection
        .map((c) => c.id)
        .join(',')
        .slice(0, 100),
    ],
    queryFn: async () => {
      if (collection.length === 0) {
        return {
          totalValue: 0,
          cardPrices: new Map(),
          byRarity: {},
          byColor: {},
          setCompletion: [],
          missingPriceCount: 0,
        };
      }

      const priceData = await fetchPrices(collection);

      // Build a name → price+metadata lookup
      const priceMap = new Map<string, ScryfallCardPrice>();
      for (const p of priceData) {
        priceMap.set(p.name.toLowerCase(), p);
      }

      let totalValue = 0;
      let missingPriceCount = 0;
      const cardPrices = new Map<string, number>();
      const byRarity: Record<string, { count: number; value: number }> = {};
      const byColor: Record<string, { count: number; value: number }> = {};
      const setMap = new Map<string, { setName: string; count: number }>();

      for (const card of collection) {
        const resolved = priceMap.get(card.card_name.toLowerCase());
        const priceStr = card.foil
          ? (resolved?.prices?.usd_foil ?? resolved?.prices?.usd)
          : (resolved?.prices?.usd ?? resolved?.prices?.usd_foil);
        const price = priceStr ? parseFloat(priceStr) : 0;

        if (price > 0) {
          const lineValue = price * card.quantity;
          totalValue += lineValue;
          cardPrices.set(card.card_name, price);
        } else {
          missingPriceCount++;
        }

        // Rarity breakdown
        const rarity = resolved?.rarity ?? 'unknown';
        if (!byRarity[rarity]) byRarity[rarity] = { count: 0, value: 0 };
        byRarity[rarity].count += card.quantity;
        byRarity[rarity].value += price * card.quantity;

        // Color breakdown
        const colors = resolved?.color_identity ?? [];
        if (colors.length === 0) {
          if (!byColor['Colorless'])
            byColor['Colorless'] = { count: 0, value: 0 };
          byColor['Colorless'].count += card.quantity;
          byColor['Colorless'].value += price * card.quantity;
        } else {
          for (const c of colors) {
            const label = COLOR_LABELS[c] || c;
            if (!byColor[label]) byColor[label] = { count: 0, value: 0 };
            byColor[label].count += card.quantity;
            byColor[label].value += price * card.quantity;
          }
        }

        // Set tracking
        if (resolved?.set) {
          const existing = setMap.get(resolved.set);
          if (existing) {
            existing.count += card.quantity;
          } else {
            setMap.set(resolved.set, {
              setName: resolved.set_name,
              count: card.quantity,
            });
          }
        }
      }

      const setCompletion = Array.from(setMap.entries())
        .map(([setCode, data]) => ({
          setCode,
          setName: data.setName,
          ownedCount: data.count,
        }))
        .sort((a, b) => b.ownedCount - a.ownedCount);

      return {
        totalValue: Math.round(totalValue * 100) / 100,
        cardPrices,
        byRarity,
        byColor,
        setCompletion,
        missingPriceCount,
      };
    },
    enabled: collection.length > 0,
    staleTime: 30 * 60 * 1000, // 30 min (prices don't change fast)
    gcTime: 60 * 60 * 1000,
  });
}
