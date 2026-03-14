/**
 * Hook for collection value estimation and set tracking.
 * Uses local price_snapshots table first, falls back to shared scryfall client.
 * @module hooks/useCollectionValue
 */

import { useQuery } from '@tanstack/react-query';
import { useCollection } from '@/hooks/useCollection';
import { getLocalPrices, getLocalCardsByNames } from '@/services/local-cards';
import { getCardsByExactNames } from '@/lib/scryfall/client';

interface CardMeta {
  rarity: string;
  colors: string[];
  priceUsd: number | null;
  priceUsdFoil: number | null;
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

      const cardNames = collection.map((c) => c.card_name);

      // Try local prices + card metadata first
      const [localPrices, localCards] = await Promise.all([
        getLocalPrices(cardNames),
        getLocalCardsByNames(cardNames),
      ]);

      // Build unified metadata lookup from local data
      const metaMap = new Map<string, CardMeta>();

      for (const name of cardNames) {
        const key = name.toLowerCase();
        if (metaMap.has(key)) continue;

        const lp = localPrices.get(name);
        const lc = localCards.get(name);

        metaMap.set(key, {
          rarity: lc?.rarity ?? 'common',
          colors: lc?.colors ?? [],
          priceUsd: lp?.price_usd ?? null,
          priceUsdFoil: lp?.price_usd_foil ?? null,
        });
      }

      // Find cards missing price data — fetch from shared client
      const missingPriceNames = cardNames.filter(
        (name) => !localPrices.has(name),
      );

      if (missingPriceNames.length > 0) {
        const uniqueMissing = [...new Set(missingPriceNames)];
        try {
          const scryfallCards = await getCardsByExactNames(uniqueMissing);
          for (const card of scryfallCards) {
            const key = card.name.toLowerCase();
            const existing = metaMap.get(key);
            metaMap.set(key, {
              rarity: existing?.rarity ?? card.rarity ?? 'common',
              colors: existing?.colors?.length ? existing.colors : (card.color_identity ?? []),
              priceUsd: card.prices?.usd ? parseFloat(card.prices.usd) : null,
              priceUsdFoil: card.prices?.usd_foil ? parseFloat(card.prices.usd_foil) : null,
            });
          }
        } catch {
          // Continue with what we have
        }
      }

      let totalValue = 0;
      let missingPriceCount = 0;
      const cardPrices = new Map<string, number>();
      const byRarity: Record<string, { count: number; value: number }> = {};
      const byColor: Record<string, { count: number; value: number }> = {};

      for (const card of collection) {
        const key = card.card_name.toLowerCase();
        const meta = metaMap.get(key);
        const priceVal = card.foil
          ? (meta?.priceUsdFoil ?? meta?.priceUsd ?? null)
          : (meta?.priceUsd ?? meta?.priceUsdFoil ?? null);
        const price = priceVal ?? 0;

        if (price > 0) {
          const lineValue = price * card.quantity;
          totalValue += lineValue;
          cardPrices.set(card.card_name, price);
        } else {
          missingPriceCount++;
        }

        // Rarity breakdown
        const rarity = meta?.rarity ?? 'unknown';
        if (!byRarity[rarity]) byRarity[rarity] = { count: 0, value: 0 };
        byRarity[rarity].count += card.quantity;
        byRarity[rarity].value += price * card.quantity;

        // Color breakdown
        const colors = meta?.colors ?? [];
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
      }

      return {
        totalValue: Math.round(totalValue * 100) / 100,
        cardPrices,
        byRarity,
        byColor,
        setCompletion: [],
        missingPriceCount,
      };
    },
    enabled: collection.length > 0,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
