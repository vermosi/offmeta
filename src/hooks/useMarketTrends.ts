/**
 * Hook for fetching market trend data (biggest price movers).
 * Falls back to deterministic demo data when real snapshots are sparse.
 * @module hooks/useMarketTrends
 */

import { useQuery } from '@tanstack/react-query';
import {
  fetchPriceMovers,
  PriceMoverError,
  type PriceMoverErrorKind,
  type PriceMoverSource,
} from '@/services/price-movers';

/** Human-readable copy for each failure mode. */
export const PRICE_MOVER_ERROR_COPY: Record<PriceMoverErrorKind, string> = {
  timeout: 'Price movers are taking longer than usual to load.',
  network: 'You appear to be offline — we could not reach the price data.',
  server: 'Price data is temporarily unavailable.',
};

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
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });

  const errorKind: PriceMoverErrorKind =
    query.error instanceof PriceMoverError ? query.error.kind : 'server';

  const allMovers = query.data?.movers ?? [];
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
    /** True while a retry/refresh is in flight over existing data. */
    isRefetching: query.isFetching && !query.isLoading,
    errorKind,
    errorMessage: PRICE_MOVER_ERROR_COPY[errorKind],
    retry: query.refetch,
    isEmpty: !query.isLoading && !query.isError && allMovers.length === 0,
    /** Epoch ms the underlying data was fetched from the backend. */
    fetchedAt: query.data?.fetchedAt ?? null,
    /** Whether this render's data came from the in-memory cache. */
    source: (query.data?.source ?? null) as PriceMoverSource | null,
  };
}

