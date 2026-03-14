/**
 * Hook for collection value estimation and set tracking.
 * Uses local price_snapshots table first, falls back to Scryfall.
 * @module hooks/useCollectionValue
 */

import { useQuery } from '@tanstack/react-query';
import { useCollection, type CollectionCard } from '@/hooks/useCollection';
import { getLocalPrices, getLocalCardsByNames, type LocalCard } from '@/services/local-cards';

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
}

const BATCH_SIZE = 75;

async function fetchPricesFromScryfall(
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

      const cardNames = collection.map((c) => c.card_name);

      // Try local prices + card metadata first
      const [localPrices, localCards] = await Promise.all([
        getLocalPrices(cardNames),
        getLocalCardsByNames(cardNames),
      ]);

      // Find cards with no local price data — only fetch those from Scryfall
      const missingPriceCards = collection.filter(
        (c) => !localPrices.has(c.card_name),
      );

      let scryfallData: ScryfallCardPrice[] = [];
      if (missingPriceCards.length > 0) {
        scryfallData = await fetchPricesFromScryfall(missingPriceCards);
      }

      // Build unified price + metadata lookup
      const priceMap = new Map<string, { usd: number | null; usd_foil: number | null }>();
      const metaMap = new Map<string, { rarity: string; colors: string[] }>();

      // Local prices
      for (const [name, lp] of localPrices) {
        priceMap.set(name.toLowerCase(), {
          usd: lp.price_usd,
          usd_foil: lp.price_usd_foil,
        });
      }

      // Local card metadata
      for (const [name, lc] of localCards) {
        metaMap.set(name.toLowerCase(), {
          rarity: lc.rarity ?? 'common',
          colors: lc.colors,
        });
      }

      // Scryfall fallback prices
      for (const s of scryfallData) {
        const key = s.name.toLowerCase();
        if (!priceMap.has(key)) {
          priceMap.set(key, {
            usd: s.prices.usd ? parseFloat(s.prices.usd) : null,
            usd_foil: s.prices.usd_foil ? parseFloat(s.prices.usd_foil) : null,
          });
        }
        if (!metaMap.has(key)) {
          metaMap.set(key, {
            rarity: s.rarity,
            colors: s.color_identity,
          });
        }
      }

      let totalValue = 0;
      let missingPriceCount = 0;
      const cardPrices = new Map<string, number>();
      const byRarity: Record<string, { count: number; value: number }> = {};
      const byColor: Record<string, { count: number; value: number }> = {};

      for (const card of collection) {
        const key = card.card_name.toLowerCase();
        const prices = priceMap.get(key);
        const priceVal = card.foil
          ? (prices?.usd_foil ?? prices?.usd ?? null)
          : (prices?.usd ?? prices?.usd_foil ?? null);
        const price = priceVal ?? 0;

        if (price > 0) {
          const lineValue = price * card.quantity;
          totalValue += lineValue;
          cardPrices.set(card.card_name, price);
        } else {
          missingPriceCount++;
        }

        // Rarity breakdown
        const meta = metaMap.get(key);
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
        setCompletion: [], // Set completion requires Scryfall set data we don't store
        missingPriceCount,
      };
    },
    enabled: collection.length > 0,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
