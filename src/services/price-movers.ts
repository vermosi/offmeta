/**
 * Price mover fetching with a bounded in-memory TTL cache.
 * Prevents repeated `get_price_movers` RPC calls for the same window
 * during a session. No persistent storage is used.
 * @module services/price-movers
 */

import { supabase } from '@/integrations/supabase/client';
import type { PriceMover } from '@/hooks/useMarketTrends';

const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_CACHE_ENTRIES = 12;
/** Requests slower than this are surfaced as a timeout to the user. */
export const PRICE_MOVER_TIMEOUT_MS = 12_000;

export type PriceMoverErrorKind = 'timeout' | 'network' | 'server';

/** Typed failure so the UI can show an accurate, friendly message. */
export class PriceMoverError extends Error {
  readonly kind: PriceMoverErrorKind;

  constructor(kind: PriceMoverErrorKind, message: string) {
    super(message);
    this.name = 'PriceMoverError';
    this.kind = kind;
  }
}

interface CacheEntry {
  value: PriceMover[];
  expiresAt: number;
  /** Epoch ms when this data was fetched from the backend. */
  fetchedAt: number;
}

/** Where a result came from, surfaced in the UI as a cache indicator. */
export type PriceMoverSource = 'network' | 'cache' | 'inflight';

export interface PriceMoverResult {
  movers: PriceMover[];
  fetchedAt: number;
  source: PriceMoverSource;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<PriceMoverResult>>();

const cacheKey = (daysBack: number, limit: number) => `${daysBack}:${limit}`;

function readCache(key: string): CacheEntry | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  // Refresh LRU position.
  cache.delete(key);
  cache.set(key, entry);
  return entry;
}

function writeCache(key: string, value: PriceMover[], fetchedAt: number): void {
  cache.set(key, { value, fetchedAt, expiresAt: fetchedAt + CACHE_TTL_MS });
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

/** Clears the in-memory price mover cache (used by tests). */
export function clearPriceMoverCache(): void {
  cache.clear();
  inflight.clear();
}

/**
 * Fetches price movers, serving from the in-memory cache when fresh
 * and de-duplicating concurrent requests for the same key.
 */
export async function fetchPriceMovers(
  daysBack: number,
  limit: number,
): Promise<PriceMoverResult> {
  const key = cacheKey(daysBack, limit);

  const cached = readCache(key);
  if (cached) {
    return {
      movers: cached.value,
      fetchedAt: cached.fetchedAt,
      source: 'cache',
    };
  }

  const pending = inflight.get(key);
  if (pending) {
    return pending.then((result) => ({ ...result, source: 'inflight' }));
  }

  const request = (async () => {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(
        () =>
          reject(
            new PriceMoverError(
              'timeout',
              'Price movers took too long to load.',
            ),
          ),
        PRICE_MOVER_TIMEOUT_MS,
      );
    });

    const { data, error } = await Promise.race([
      supabase.rpc('get_price_movers', {
        days_back: daysBack,
        limit_count: limit,
      }),
      timeout,
    ]);

    if (error) {
      const isNetwork = /fetch|network|failed to fetch/i.test(
        error.message ?? '',
      );
      throw new PriceMoverError(
        isNetwork ? 'network' : 'server',
        isNetwork
          ? 'Network connection lost while loading price movers.'
          : 'Price movers are temporarily unavailable.',
      );
    }
    const movers = (data ?? []) as PriceMover[];
    const fetchedAt = Date.now();
    writeCache(key, movers, fetchedAt);
    return { movers, fetchedAt, source: 'network' as const };
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, request);
  return request;
}
