import { supabase } from './client.ts';

export interface CacheEntry {
  result: {
    scryfallQuery: string;
    explanation: {
      readable: string;
      assumptions: string[];
      confidence: number;
    };
    showAffiliate: boolean;
  };
  timestamp: number;
}

// In-memory cache for fast access within same instance
const queryCache = new Map<string, CacheEntry>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes for in-memory

export function getCacheKey(
  query: string,
  filters?: Record<string, unknown>,
  cacheSalt?: string,
): string {
  // Apply synonym normalization for better cache hit rate
  const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
  return `${normalized}|${JSON.stringify(filters || {})}|${cacheSalt || ''}`;
}

// Cryptographic hash function for cache key using Web Crypto API
async function hashCacheKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  // Return first 16 characters of hex string for reasonable key length
  return hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 16);
}

export async function getCachedResult(
  query: string,
  filters?: Record<string, unknown>,
  cacheSalt?: string,
): Promise<CacheEntry['result'] | null> {
  const key = getCacheKey(query, filters, cacheSalt);
  const hash = await hashCacheKey(key);
  const cached = queryCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    // LRU touch: delete + re-insert moves entry to end of Map iteration order
    queryCache.delete(key);
    queryCache.set(key, cached);
    logCacheEvent('memory_cache_hit', query, hash, null);
    return cached.result;
  }
  return null;
}

// Deduplication for cache events (only log once per query per minute)
const recentCacheLogEvents = new Map<string, number>();
const CACHE_LOG_DEDUP_WINDOW_MS = 60000;

/**
 * Check if we should log a cache event (deduplication)
 */
function shouldLogCacheEvent(hash: string, eventType: string): boolean {
  const key = `${eventType}:${hash}`;
  const now = Date.now();
  const lastLogged = recentCacheLogEvents.get(key);

  if (lastLogged && now - lastLogged < CACHE_LOG_DEDUP_WINDOW_MS) {
    return false;
  }

  recentCacheLogEvents.set(key, now);

  // Cleanup old entries periodically
  if (recentCacheLogEvents.size > 200) {
    const cutoff = now - CACHE_LOG_DEDUP_WINDOW_MS;
    for (const [k, time] of recentCacheLogEvents.entries()) {
      if (time < cutoff) recentCacheLogEvents.delete(k);
    }
  }

  return true;
}

/**
 * Log cache events to analytics_events table for performance tracking.
 * Includes deduplication to prevent event spam.
 */
export function logCacheEvent(
  eventType: 'cache_hit' | 'cache_miss' | 'cache_set' | 'memory_cache_hit',
  query: string,
  hash: string,
  hitCount: number | null,
): void {
  // Skip duplicate cache events within the dedup window
  if (!shouldLogCacheEvent(hash, eventType)) {
    return;
  }

  // Fire and forget - don't block on analytics
  (async () => {
    try {
      await supabase.from('analytics_events').insert({
        event_type: eventType,
        event_data: {
          query: query.substring(0, 200),
          hash: hash.substring(0, 8),
          hit_count: hitCount,
          timestamp: new Date().toISOString(),
        },
      });
    } catch {
      // Ignore analytics errors
    }
  })();
}

/**
 * Check persistent database cache for a query.
 * Returns cached result if found and not expired.
 */
export async function getPersistentCache(
  query: string,
  filters?: Record<string, unknown>,
  cacheSalt?: string,
): Promise<CacheEntry['result'] | null> {
  const key = getCacheKey(query, filters, cacheSalt);
  const hash = await hashCacheKey(key);

  try {
    const { data, error } = await supabase
      .from('query_cache')
      .select(
        'scryfall_query, explanation, confidence, show_affiliate, hit_count',
      )
      .eq('query_hash', hash)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      // Log cache miss for analytics
      logCacheEvent('cache_miss', query, hash, null);
      return null;
    }

    const newHitCount = (data.hit_count || 0) + 1;

    // Update hit count in background (fire and forget)
    (async () => {
      try {
        await supabase
          .from('query_cache')
          .update({
            hit_count: newHitCount,
            last_hit_at: new Date().toISOString(),
          })
          .eq('query_hash', hash);
      } catch {
        // Ignore errors
      }
    })();

    const result = {
      scryfallQuery: data.scryfall_query,
      explanation: data.explanation as {
        readable: string;
        assumptions: string[];
        confidence: number;
      },
      showAffiliate: data.show_affiliate,
    };

    // Populate in-memory cache too
    queryCache.set(key, { result, timestamp: Date.now() });

    logCacheEvent('cache_hit', query, hash, newHitCount);
    return result;
  } catch {
    // Cache read errors should not affect the main flow
    return null;
  }
}

/**
 * Store result in persistent database cache.
 */
export async function setPersistentCache(
  query: string,
  filters: Record<string, unknown> | undefined,
  result: CacheEntry['result'],
  cacheSalt?: string,
): Promise<void> {
  if (result.explanation.confidence < 0.65) return;

  const key = getCacheKey(query, filters, cacheSalt);
  const hash = await hashCacheKey(key);
  const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');

  try {
    await supabase.from('query_cache').upsert(
      {
        query_hash: hash,
        normalized_query: normalized.substring(0, 500),
        scryfall_query: result.scryfallQuery.substring(0, 1000),
        explanation: result.explanation,
        confidence: result.explanation.confidence,
        show_affiliate: result.showAffiliate,
        hit_count: 1,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
      },
      {
        onConflict: 'query_hash',
      },
    );

    logCacheEvent('cache_set', query, hash, null);
  } catch {
    // Silently fail - cache write errors should not affect the main flow
  }
}

export function setCachedResult(
  query: string,
  filters: Record<string, unknown> | undefined,
  result: CacheEntry['result'],
  cacheSalt?: string,
): void {
  const key = getCacheKey(query, filters, cacheSalt);
  queryCache.set(key, { result, timestamp: Date.now() });

  // Limit cache size to prevent memory issues
  if (queryCache.size > 1000) {
    const oldestKey = queryCache.keys().next().value;
    if (oldestKey) queryCache.delete(oldestKey);
  }

  // Store in persistent cache (fire and forget)
  setPersistentCache(query, filters, result, cacheSalt).catch(() => {});
}

/**
 * Cleanup expired entries on access (serverless-safe alternative to setInterval).
 */
function cleanupExpiredCacheEntries(): void {
  const now = Date.now();
  for (const [key, entry] of queryCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      queryCache.delete(key);
    }
  }
}

// Cleanup counter - run cleanup every N accesses to avoid overhead on every call
let cacheCleanupCounter = 0;
const CACHE_CLEANUP_INTERVAL = 50; // Run cleanup every 50 accesses

/**
 * Trigger cleanup if enough accesses have occurred.
 * This is serverless-safe as it doesn't rely on setInterval.
 */
export function maybeCacheCleanup(): void {
  cacheCleanupCounter++;
  if (cacheCleanupCounter >= CACHE_CLEANUP_INTERVAL) {
    cacheCleanupCounter = 0;
    cleanupExpiredCacheEntries();
  }
}

export function cleanupCache(): void {
  queryCache.clear();
  cacheCleanupCounter = 0;
}
