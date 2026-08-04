/**
 * Hook for fetching price history snapshots for a card.
 * Returns the last 30 days of price data for sparkline rendering.
 * @module hooks/usePriceHistory
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PriceSnapshot {
  recorded_at: string;
  price_low: number | null;
  price_average: number | null;
  price_market: number | null;
  price_foil: number | null;
  price_usd: number | null;
  price_usd_foil: number | null;
}

const SELECT_COLUMNS =
  'recorded_at, price_low, price_average, price_market, price_foil, price_usd, price_usd_foil';

/**
 * Price history for a card. When `scryfallId` is provided, history is scoped to
 * that specific printing, falling back to name-level history when the printing
 * has no recorded snapshots.
 */
export function usePriceHistory(cardName: string | undefined, days = 30, scryfallId?: string) {
  return useQuery<PriceSnapshot[]>({
    queryKey: ['price-history', cardName, days, scryfallId ?? 'all'],
    queryFn: async () => {
      if (!cardName) return [];

      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const baseQuery = () =>
        supabase
          .from('price_snapshots')
          .select(SELECT_COLUMNS)
          .eq('card_name', cardName)
          .gte('recorded_at', since)
          .order('recorded_at', { ascending: true });

      if (scryfallId) {
        const { data, error } = await baseQuery().eq('scryfall_id', scryfallId);
        if (error) throw error;
        if (data && data.length > 0) return data as PriceSnapshot[];
      }

      const { data, error } = await baseQuery();
      if (error) throw error;
      return (data ?? []) as PriceSnapshot[];
    },
    enabled: !!cardName,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}


/** Compute simple trend: positive = price going up, negative = down */
export function computePriceTrend(snapshots: PriceSnapshot[]): {
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
} {
  const prices = snapshots
    .map((s) => s.price_usd)
    .filter((p): p is number => p != null && p > 0);

  if (prices.length < 2) return { direction: 'stable', changePercent: 0 };

  const first = prices[0];
  const last = prices[prices.length - 1];
  const change = ((last - first) / first) * 100;

  return {
    direction: change > 1 ? 'up' : change < -1 ? 'down' : 'stable',
    changePercent: Math.round(change * 10) / 10,
  };
}
