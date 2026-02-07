
# Code Review: OffMeta

## Overall Assessment

The codebase is well-structured, follows consistent conventions, and demonstrates solid engineering practices. The separation of concerns between translation logic (edge functions) and UI (React components) is clean. Below are findings organized by severity.

---

## Critical Issues

### 1. Duplicate Caching Logic (DRY Violation)

There are **three independent caching layers** with duplicated normalization logic:

- `src/components/UnifiedSearchBar.tsx` (lines 48-104) -- client-side sessionStorage cache
- `src/hooks/useSearchQuery.ts` (lines 63-76) -- in-memory dedup via `pendingTranslations` Map
- `supabase/functions/semantic-search/cache.ts` -- edge function in-memory + persistent DB cache

Each re-implements `normalizeQueryKey()` with the same logic. If one changes, the others won't match, causing phantom cache misses. The client-side cache in `UnifiedSearchBar` also bypasses the TanStack Query cache in `useSearchQuery`, meaning the two client layers can serve stale/conflicting results.

**Recommendation**: Remove the manual sessionStorage cache from `UnifiedSearchBar` and rely solely on TanStack Query's built-in caching (already configured with 24h stale time for translations). This eliminates ~60 lines and one entire cache layer.

---

### 2. `handleSearch` in UnifiedSearchBar Calls `supabase.functions.invoke` Directly

`UnifiedSearchBar.handleSearch` (line 339) calls `supabase.functions.invoke('semantic-search', ...)` directly, completely bypassing the `useSearchQuery` / `useTranslateQuery` hook. This means:

- The TanStack Query deduplication in `useSearchQuery.ts` is never used for the main search flow
- The `usePrefetchPopularQueries` hook prefetches into TanStack cache, but `UnifiedSearchBar` reads from sessionStorage -- they never share cache entries
- Rate limiting in `useSearchQuery.ts` (`checkSearchRateLimit`) is also bypassed

**Recommendation**: Refactor `UnifiedSearchBar` to use the `useTranslateQuery` hook or `translateQueryWithDedup` function instead of direct `supabase.functions.invoke`.

---

## Moderate Issues

### 3. `useEffect` for Filter Notification is a Side-Effect Smell

In `SearchFilters.tsx` (line 235-237):
```typescript
useEffect(() => {
  onFilteredCards(filteredCards, hasActiveFilters, filters);
}, [filteredCards, hasActiveFilters, onFilteredCards, filters]);
```

This calls a parent callback inside `useEffect`, which triggers a parent re-render during the child's commit phase. This is a known React anti-pattern that can cause render cascades. The parent (`Index.tsx`) then calls `setFilteredCards`, `setHasActiveFilters`, and `setActiveFilters` -- three separate state updates causing additional re-renders.

**Recommendation**: Lift filter state up to `Index.tsx` or use a reducer. The parent should own the filter state and pass it down; `SearchFilters` should just call `setFilters` on change.

### 4. Hardcoded CMC Reset Value Mismatch

In `SearchFilters.tsx` line 486, the CMC badge reset uses hardcoded `[0, 16]`:
```typescript
onClick={() => setFilters((prev) => ({ ...prev, cmcRange: [0, 16] }))}
```
But `defaultMaxCmc` is computed dynamically from the card data (line 123-125) and can exceed 16. This means clicking the CMC badge to "clear" it sets a different value than the actual default, leaving a phantom filter active.

**Recommendation**: Use `defaultMaxCmc` instead of the hardcoded `16`.

### 5. Duplicate `normalizeOrGroups` Function

`normalizeOrGroups` is defined in both:
- `src/lib/scryfall/query.ts` (line 279)
- `supabase/functions/semantic-search/validation.ts` (line 302)

The implementations differ slightly (the `query.ts` version handles regex `/` delimiters, the edge function version does not). This divergence means client-side and server-side query normalization can produce different results.

**Recommendation**: Extract to a shared utility or ensure they stay in sync. At minimum, add a comment cross-referencing the duplicate.

### 6. Unused Imports and Exports

- `useSearchQuery.ts` exports `useTranslateQuery`, `useCardDetails`, `useCardSearch`, `invalidateTranslationCache`, and `setTranslationCache` -- none of which appear to be imported anywhere in the codebase based on the main search flow going through `UnifiedSearchBar` directly.
- `History` icon imported in `UnifiedSearchBar.tsx` (line 17) is only used on mobile but still bundled.

**Recommendation**: Audit and remove dead exports. Consider whether `useSearchQuery.ts` hooks should replace the direct invocation pattern.

---

## Minor Issues

### 7. `queryClient` Instantiated Outside Component Tree

In `App.tsx` (line 14), `queryClient` is created at module scope. This is actually fine for SPAs but would be problematic if SSR were ever added. Given the project is Vite/CSR-only, this is a non-issue but worth a comment.

### 8. Error Message Exposed in ErrorBoundary

`ErrorBoundary.tsx` (line 59) displays `this.state.error.message` directly to users. While the edge function sanitizes errors server-side, client-side errors (e.g., from React rendering) could leak internal details like component names or stack traces.

**Recommendation**: Show a generic message in production; only show details in development.

### 9. `maybeCacheCleanup` is Exported but Never Called

In `cache.ts` (line 263), `maybeCacheCleanup()` is defined and exported but never invoked anywhere in the edge function handler (`index.ts`). The in-memory cache grows unbounded until the serverless instance is recycled.

**Recommendation**: Call `maybeCacheCleanup()` at the start of each request handler.

### 10. Comment Accuracy: Cache TTL Mismatch

`UnifiedSearchBar.tsx` line 31 says "30 minute cache" but line 373 comment says "15 minutes":
```typescript
const RESULT_CACHE_TTL = 30 * 60 * 1000; // 30 minute cache
// ...
// Cache the result client-side for 15 minutes  <-- wrong comment
```

---

## Positive Observations

- **Strong type safety**: Comprehensive TypeScript interfaces for Scryfall data, filter state, and search results
- **Excellent accessibility**: Skip links, ARIA labels, `role` attributes, and screen-reader-only hints throughout
- **Robust error handling**: Circuit breaker pattern, fallback queries, graceful degradation at every layer
- **Rate limiting at multiple levels**: Client-side, session-based, and IP-based on the edge function
- **Well-documented code**: JSDoc comments on all public functions with `@param`, `@returns`, and `@example`
- **Comprehensive test suite**: 1,150+ tests covering security, regression, golden translations, and live API validation

---

## Summary of Recommended Actions (Priority Order)

1. Consolidate the three caching layers -- remove `UnifiedSearchBar` sessionStorage cache and use TanStack Query
2. Route `UnifiedSearchBar` search through `useTranslateQuery` instead of direct `supabase.functions.invoke`
3. Fix the hardcoded CMC `[0, 16]` reset to use `defaultMaxCmc`
4. Call `maybeCacheCleanup()` in the edge function request handler
5. Fix the stale "15 minutes" comment
6. Audit and remove unused hook exports from `useSearchQuery.ts`
