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
    // Log memory cache hit
    logCacheEvent('memory_cache_hit', query, hash, null);
    console.log(
      JSON.stringify({ event: 'memory_cache_hit', hash: hash.substring(0, 8) }),
    );
    return cached.result;
  }
  return null;
}

/**
 * Log cache events to analytics_events table for performance tracking.
 */
export function logCacheEvent(
  eventType: 'cache_hit' | 'cache_miss' | 'cache_set' | 'memory_cache_hit',
  query: string,
  hash: string,
  hitCount: number | null,
): void {
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

    // Log cache hit for analytics
    logCacheEvent('cache_hit', query, hash, newHitCount);

    console.log(
      JSON.stringify({
        event: 'persistent_cache_hit',
        hash: hash.substring(0, 8),
        hitCount: newHitCount,
      }),
    );

    return result;
  } catch (e) {
    console.error('Persistent cache read error:', e);
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
  if (result.explanation.confidence < 0.7) return;

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

    // Log cache set for analytics
    logCacheEvent('cache_set', query, hash, null);

    console.log(
      JSON.stringify({
        event: 'persistent_cache_set',
        hash: hash.substring(0, 8),
        confidence: result.explanation.confidence,
      }),
    );
  } catch (e) {
    console.error('Persistent cache write error:', e);
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

// Clean up expired in-memory cache entries periodically
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of queryCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      queryCache.delete(key);
    }
  }
}, 60000);

export function cleanupCache() {
  clearInterval(cleanupInterval);
  queryCache.clear();
}
