# supabase\functions\semantic-search\cache.ts

- CacheEntry · interface · L4-L15 — interface CacheEntry
- getCacheKey · function · L21-L29 — function getCacheKey( query: string, filters?: Record<string, unknown> | null, cacheSalt?: string, ): string
- hashMemoryCacheKey · function · L32-L40 — function hashMemoryCacheKey(key: string): string
- hashPersistentCacheKey · function · L43-L52 — async function hashPersistentCacheKey(key: string): Promise<string>
- getCachedResult · function · L54-L70 — async function getCachedResult( query: string, filters?: Record<string, unknown> | null, cacheSalt?: string, ): Promise<CacheEntry['result'] | null>
- logCacheEvent · function · L82-L89 — function logCacheEvent( _eventType: 'cache_hit' | 'cache_miss' | 'cache_set' | 'memory_cache_hit', _query: string, _hash: string, _hitCount: number | null, ): void
- getPersistentCache · function · L95-L155 — async function getPersistentCache( query: string, filters?: Record<string, unknown> | null, cacheSalt?: string, ): Promise<CacheEntry['result'] | null>
- setPersistentCache · function · L160-L193 — async function setPersistentCache( query: string, filters: Record<string, unknown> | null | undefined, result: CacheEntry['result'], cacheSalt?: string, ): Promise<void>
- setCachedResult · function · L195-L212 — function setCachedResult( query: string, filters: Record<string, unknown> | null | undefined, result: CacheEntry['result'], cacheSalt?: string, ): void
- cleanupExpiredCacheEntries · function · L217-L224 — function cleanupExpiredCacheEntries(): void
- maybeCacheCleanup · function · L234-L240 — function maybeCacheCleanup(): void
- cleanupCache · function · L242-L245 — function cleanupCache(): void
