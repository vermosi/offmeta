/**
 * Batch-fetch price history for multiple cards at once.
 * Returns a Map of card_name → SparklinePoint[] for efficient rendering.
 * @module hooks/useBatchPriceHistory
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SparklinePoint } from '@/components/PriceSparkline';

const BATCH_SIZE = 200;

export function useBatchPriceHistory(cardNames: string[]) {
  return useQuery<Map<string, SparklinePoint[]>>({
    queryKey: ['batch-price-history', ...cardNames.slice(0, 20)],
    queryFn: async () => {
      if (cardNames.length === 0) return new Map();

      const ninetyDaysAgo = new Date(
        Date.now() - 90 * 24 * 60 * 60 * 1000,
      ).toISOString();

      const allRows: Array<{
        card_name: string;
        recorded_at: string;
        price_usd: number | null;
      }> = [];

      // Batch fetch to avoid query size limits
      for (let i = 0; i < cardNames.length; i += BATCH_SIZE) {
        const batch = cardNames.slice(i, i + BATCH_SIZE);
        const { data } = await supabase
          .from('price_snapshots')
          .select('card_name, recorded_at, price_usd')
          .in('card_name', batch)
          .gte('recorded_at', ninetyDaysAgo)
          .order('recorded_at', { ascending: true });

        if (data) allRows.push(...data);
      }

      // Group by card_name
      const result = new Map<string, SparklinePoint[]>();
      for (const row of allRows) {
        if (row.price_usd == null || row.price_usd <= 0) continue;
        const existing = result.get(row.card_name) ?? [];
        existing.push({ price: row.price_usd as number, date: row.recorded_at });
        result.set(row.card_name, existing);
      }

      return result;
    },
    enabled: cardNames.length > 0,
    staleTime: 10 * 60 * 1000, // 10 min
  });
}
