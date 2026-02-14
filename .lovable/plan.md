

# Review Fixes Plan

Based on both the original code review and the follow-up review, here is a prioritized plan of actionable fixes. Items already resolved are noted.

---

## Already Fixed (No Action Needed)

- **maybeCacheCleanup**: Already called at the top of the edge function handler (line 86 of `index.ts`).
- **CMC badge reset**: Already uses `defaultMaxCmc` (line 486 of `SearchFilters.tsx`).
- **ErrorBoundary**: Already only shows error details in dev mode (`import.meta.env.DEV` check on line 56).
- **sessionStorage cache in UnifiedSearchBar**: Already removed; the component now calls `translateQueryWithDedup` from `useSearchQuery.ts`.

---

## Fix 1: Use `CLIENT_CONFIG` Constants Instead of Local Duplicates

**Files**: `src/components/UnifiedSearchBar.tsx`, `src/hooks/useSearchQuery.ts`

`UnifiedSearchBar.tsx` redeclares `SEARCH_TIMEOUT_MS = 15000` and `MAX_HISTORY_ITEMS = 5` locally (lines 29-30) instead of importing from `src/lib/config.ts`. Similarly, `useSearchQuery.ts` redeclares `TRANSLATION_STALE_TIME`, `CARD_SEARCH_STALE_TIME`, and `SEARCH_RATE_LIMIT` (lines 26-34) instead of importing from config.

**Changes**:
- In `UnifiedSearchBar.tsx`: Remove local `SEARCH_TIMEOUT_MS` and `MAX_HISTORY_ITEMS` constants, import from `CLIENT_CONFIG`
- In `useSearchQuery.ts`: Remove local `TRANSLATION_STALE_TIME`, `CARD_SEARCH_STALE_TIME`, and `SEARCH_RATE_LIMIT` constants, import from `CLIENT_CONFIG`

---

## Fix 2: Remove Dead `useLast` State (Partial)

**File**: `src/components/UnifiedSearchBar.tsx`

The `useLast` state and `canUseLast` variable are actually used in the UI (toggle buttons on lines 501-509 and 527-536), so they are NOT dead code. However, `useLast` is set to `false` on every search (line 217) and is never read during the search logic -- the toggle has no functional effect on search behavior. It's a UI element that does nothing.

**Changes**:
- Either wire `useLast` into the search logic (pass it to `translateQueryWithDedup` as `bypassCache: false` or use the saved context) OR remove the toggle buttons and the state entirely
- Recommendation: Remove it since the "Use last" concept is already handled by TanStack Query caching

---

## Fix 3: Remove `rateLimitCountdown` from `handleSearch` Dependencies

**File**: `src/components/UnifiedSearchBar.tsx`

`rateLimitCountdown` is in the `useCallback` dependency array (line 337) but is only used in a toast message (line 208). This causes `handleSearch` to be recreated every second during a rate limit countdown, which also recreates the imperative handle. This is wasteful.

**Changes**:
- Use a ref for `rateLimitCountdown` inside the toast, or read it from `rateLimitedUntil` directly in the toast callback
- Remove `rateLimitCountdown` from the dependency array

---

## Fix 4: Clean Up Unused Exports in `useSearchQuery.ts`

**File**: `src/hooks/useSearchQuery.ts`

`useCardDetails` and `useCardSearch` are exported but never imported anywhere in the codebase. The comment at the bottom says they were removed, but they're still there.

**Changes**:
- Remove `useCardDetails` and `useCardSearch` hooks, or add a comment noting they're available for future use
- Keep `useTranslateQuery` (used by prefetch), `usePrefetchPopularQueries` (used in App.tsx), `useSubmitFeedback` (used by ReportIssueDialog), and `translateQueryWithDedup` (used by UnifiedSearchBar)

---

## Fix 5: Fix Stale Comment in `useSearchQuery.ts`

**File**: `src/hooks/useSearchQuery.ts`

The bottom comment says "invalidateTranslationCache and setTranslationCache removed -- they were unused" but `useCardDetails` and `useCardSearch` are also unused and still present.

**Changes**:
- Update comment or remove the unused hooks (covered by Fix 4)

---

## Summary

| # | Fix | Risk | Files |
|---|-----|------|-------|
| 1 | Consolidate constants to `CLIENT_CONFIG` | Low | `UnifiedSearchBar.tsx`, `useSearchQuery.ts` |
| 2 | Remove non-functional `useLast` toggle | Low | `UnifiedSearchBar.tsx` |
| 3 | Fix `rateLimitCountdown` dependency churn | Low | `UnifiedSearchBar.tsx` |
| 4 | Remove unused hook exports | Low | `useSearchQuery.ts` |
| 5 | Clean up stale comments | Trivial | `useSearchQuery.ts` |

All fixes are low-risk, isolated changes with no behavioral impact on the search pipeline.

