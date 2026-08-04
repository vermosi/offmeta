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

interface CacheEntry {
  value: PriceMover[];
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<PriceMover[]>>();

const cacheKey = (daysBack: number, limit: number) => `${daysBack}:${limit}`;

function readCache(key: string): PriceMover[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  // Refresh LRU position.
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

function writeCache(key: string, value: PriceMover[]): void {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
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
): Promise<PriceMover[]> {
  const key = cacheKey(daysBack, limit);

  const cached = readCache(key);
  if (cached) return cached;

  const pending = inflight.get(key);
  if (pending) return pending;

  const request = (async () => {
    const { data, error } = await supabase.rpc('get_price_movers', {
      days_back: daysBack,
      limit_count: limit,
    });
    if (error) throw error;
    const movers = (data ?? []) as PriceMover[];
    writeCache(key, movers);
    return movers;
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, request);
  return request;
}
