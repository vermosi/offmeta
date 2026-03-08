/**
 * Hook for fetching price history snapshots for a card.
 * Returns the last 30 days of price data for sparkline rendering.
 * @module hooks/usePriceHistory
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PriceSnapshot {
  recorded_at: string;
  price_usd: number | null;
  price_usd_foil: number | null;
}

export function usePriceHistory(cardName: string | undefined) {
  return useQuery<PriceSnapshot[]>({
    queryKey: ['price-history', cardName],
    queryFn: async () => {
      if (!cardName) return [];

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('price_snapshots')
        .select('recorded_at, price_usd, price_usd_foil')
        .eq('card_name', cardName)
        .gte('recorded_at', thirtyDaysAgo)
        .order('recorded_at', { ascending: true });

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
