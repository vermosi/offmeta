/**
 * Hook for fetching market trend data (biggest price movers).
 * Falls back to deterministic demo data when real snapshots are sparse.
 * @module hooks/useMarketTrends
 */

import { useQuery } from '@tanstack/react-query';
import { fetchPriceMovers } from '@/services/price-movers';

/** Rows requested per window; paginated client-side. */
export const MOVERS_FETCH_LIMIT = 250;

export interface PriceMover {
  card_name: string;
  /** Scryfall-specific printing id (MTGJSON UUID in the price snapshots table). */
  scryfall_id: string | null;
  current_price: number;
  previous_price: number;
  change_percent: number;
  direction: 'up' | 'down' | 'stable';
  rarity: string | null;
  type_line: string | null;
  colors: string[] | null;
  legalities: Record<string, string> | null;
  set_name: string | null;
  collector_number: string | null;
}

export function useMarketTrends(daysBack: number = 7) {
  const query = useQuery({
    queryKey: ['market-trends', daysBack, MOVERS_FETCH_LIMIT],
    queryFn: () => fetchPriceMovers(daysBack, MOVERS_FETCH_LIMIT),
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

