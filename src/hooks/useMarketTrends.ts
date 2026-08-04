/**
 * Hook for fetching market trend data (biggest price movers).
 * Falls back to deterministic demo data when real snapshots are sparse.
 * @module hooks/useMarketTrends
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PriceMover {
  card_name: string;
  scryfall_id: string | null;
  current_price: number;
  previous_price: number;
  change_percent: number;
  direction: 'up' | 'down' | 'stable';
  rarity: string | null;
  type_line: string | null;
  colors: string[] | null;
  legalities: Record<string, string> | null;
}

export function useMarketTrends(daysBack: number = 7) {
  const query = useQuery({
    queryKey: ['market-trends', daysBack],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_price_movers', {
        days_back: daysBack,
        limit_count: 50,
      });

      if (error) throw error;
      return (data ?? []) as PriceMover[];
    },
    staleTime: 30 * 60 * 1000,
  });

  const allMovers = query.data ?? [];
  const gainers = allMovers
    .filter((m) => m.direction === 'up')
    .sort((a, b) => b.change_percent - a.change_percent);
  const losers = allMovers
    .filter((m) => m.direction === 'down')
    .sort((a, b) => a.change_percent - b.change_percent);

  return {
    gainers,
    losers,
    allMovers,
    isLoading: query.isLoading,
    isError: query.isError,
    isEmpty: !query.isLoading && !query.isError && allMovers.length === 0,
  };
}

