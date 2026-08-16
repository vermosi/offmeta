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

const queryCache = new Map<string, CacheEntry>();
const CACHE_TTL = 30 * 60 * 1000;

export function getCacheKey(
  query: string,
  filters?: Record<string, unknown> | null,
  cacheSalt?: string,
): string {
  const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
  return `${normalized}|${JSON.stringify(filters || {})}|${cacheSalt || ''}`;
}

function hashMemoryCacheKey(key: string): string {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

async function hashPersistentCacheKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 16);
}

export async function getCachedResult(
  query: string,
  filters?: Record<string, unknown> | null,
  cacheSalt?: string,
): Promise<CacheEntry['result'] | null> {
  const key = getCacheKey(query, filters, cacheSalt);
  const hash = hashMemoryCacheKey(key);
  const cached = queryCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    queryCache.delete(key);
    queryCache.set(key, cached);
    logCacheEvent('memory_cache_hit', query, hash, null);
    return cached.result;
  }
  return null;
}

export function logCacheEvent(
  _eventType: 'cache_hit' | 'cache_miss' | 'cache_set' | 'memory_cache_hit',
  _query: string,
  _hash: string,
  _hitCount: number | null,
): void {
  // no-op
}

async function incrementPersistentHitCount(hash: string): Promise<void> {
  await supabase.rpc(
    'increment_query_cache_hit_count' as never,
    {
      p_query_hash: hash,
    } as never,
  );
}

export async function getPersistentCache(
  query: string,
  filters?: Record<string, unknown> | null,
  cacheSalt?: string,
): Promise<CacheEntry['result'] | null> {
  const key = getCacheKey(query, filters, cacheSalt);
  const hash = await hashPersistentCacheKey(key);

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
      logCacheEvent('cache_miss', query, hash, null);
      return null;
    }

    const newHitCount = (data.hit_count || 0) + 1;
    incrementPersistentHitCount(hash).catch(() => {});

    const result = {
      scryfallQuery: data.scryfall_query,
      explanation: data.explanation as {
        readable: string;
        assumptions: string[];
        confidence: number;
      },
      showAffiliate: data.show_affiliate,
    };

    queryCache.set(key, { result, timestamp: Date.now() });

    logCacheEvent('cache_hit', query, hash, newHitCount);
    return result;
  } catch {
    return null;
  }
}

export async function setPersistentCache(
  query: string,
  filters: Record<string, unknown> | null | undefined,
  result: CacheEntry['result'],
  cacheSalt?: string,
): Promise<void> {
  if (result.explanation.confidence < 0.65) return;

  const key = getCacheKey(query, filters, cacheSalt);
  const hash = await hashPersistentCacheKey(key);
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
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
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
  filters: Record<string, unknown> | null | undefined,
  result: CacheEntry['result'],
  cacheSalt?: string,
): void {
  const key = getCacheKey(query, filters, cacheSalt);
  queryCache.set(key, { result, timestamp: Date.now() });

  if (queryCache.size > 1000) {
    const oldestKey = queryCache.keys().next().value;
    if (oldestKey) queryCache.delete(oldestKey);
  }

  setPersistentCache(query, filters, result, cacheSalt).catch(() => {});
}

function cleanupExpiredCacheEntries(): void {
  const now = Date.now();
  for (const [key, entry] of queryCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      queryCache.delete(key);
    }
  }
}

let cacheCleanupCounter = 0;
const CACHE_CLEANUP_INTERVAL = 50;

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
