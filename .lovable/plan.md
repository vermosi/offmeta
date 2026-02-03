

# OffMeta Code Review

## Executive Summary

OffMeta is a well-architected Magic: The Gathering card search application that translates natural language queries into Scryfall syntax. The codebase demonstrates solid engineering practices with clear separation of concerns, comprehensive error handling, and thoughtful performance optimizations.

**Overall Grade: A-**

The previous code review (documented in `.lovable/plan.md`) rated the project B+. Since that review, significant improvements have been made:
- CardModal refactored into 7 sub-components (previously 1187 lines)
- 41 snapshot tests added for visual regression detection
- 138 golden tests for query translation
- Benchmark tests with warmup, retry logic, and adjusted thresholds

---

## Current Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
├─────────────────────────────────────────────────────────────────┤
│  Index.tsx ─> UnifiedSearchBar ─> semantic-search Edge Function │
│       │              │                      │                   │
│       ▼              ▼                      ▼                   │
│  VirtualizedGrid  Client Cache      Translation Pipeline        │
│  (50+ cards)     (30min TTL)     ┌─────────────────────┐        │
│       │                          │ 1. Normalize        │        │
│       ▼                          │ 2. Classify         │        │
│  CardModal                       │ 3. Extract Slots    │        │
│  (7 sub-components)              │ 4. Match Concepts   │        │
│                                  │ 5. Assemble Query   │        │
│                                  │ 6. Validate/Repair  │        │
│                                  └─────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Scryfall API                               │
│  Rate-limited client with queue, retry, and timeout handling   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Strengths

### 1. Excellent Code Organization

- **Modular edge function design**: The semantic-search pipeline is well-structured with separate modules for validation, caching, circuit-breaking, and AI integration
- **Clean component decomposition**: CardModal split into 7 focused sub-components with shared types
- **Centralized configuration**: Both `src/lib/config.ts` (client) and `supabase/functions/semantic-search/config.ts` (server) consolidate magic numbers

### 2. Strong Type Safety

- Comprehensive TypeScript interfaces for Scryfall API data (`ScryfallCard`, `SearchResult`, `FilterState`)
- Well-documented types with JSDoc comments throughout
- Proper generics and type guards in utility functions

### 3. Performance Optimizations

**Frontend:**
- Virtualization with `@tanstack/react-virtual` kicks in at 50+ cards
- `CardModal` lazy-loaded with `React.lazy()` to reduce initial bundle
- Debouncing, caching (30-minute TTL), and rate limiting at multiple layers
- Infinite scroll with IntersectionObserver using refs to avoid stale closures (previous review issue fixed)

**Backend:**
- Multi-tier caching: in-memory (30 min) + persistent database (48 hours)
- Pattern matching to bypass AI entirely for known queries
- Circuit breaker pattern with half-open recovery
- Deterministic path for Scryfall-like syntax (skips AI)

### 4. Comprehensive Error Handling

- `ErrorBoundary` component with retry and refresh options
- Graceful fallbacks when AI fails (circuit breaker → deterministic → keyword extraction)
- Structured logging with request-scoped loggers
- Monitoring module ready for Sentry integration

### 5. Test Coverage

- 601+ frontend tests including 41 snapshot tests
- 138 golden tests for query translation validation
- Benchmark suite with warmup, retry logic, and realistic thresholds
- Table-driven validation tests for edge cases

---

## Areas for Improvement

### High Priority

#### 1. Interval Cleanup Not Guaranteed in Serverless
**Files**: `supabase/functions/_shared/rateLimit.ts` (lines 170-183), `supabase/functions/semantic-search/cache.ts` (lines 244-251)

```typescript
const cleanupInterval = setInterval(() => {
  // cleanup logic
}, 60000);
```

**Issue**: Both files use `setInterval` for cleanup. While `cleanupRateLimiter()` and `cleanupCache()` functions exist to clear the interval, they are never called. In serverless environments where function instances may be reused or terminated unexpectedly, this could lead to resource leaks.

**Recommendation**: 
- Use time-based expiry checks during access rather than background cleanup
- Or ensure cleanup functions are called in a shutdown handler if available

#### 2. Inconsistent Import Paths for Deprecated Modules
**Files**: Multiple components still import from deprecated re-export files

```typescript
// In src/components/UnifiedSearchBar.tsx line 19
import { useIsMobile } from '@/hooks/use-mobile'; // deprecated

// In src/components/CardModal.tsx line 26
import { useIsMobile } from '@/hooks/use-mobile'; // deprecated
```

**Recommendation**: Update imports to use the canonical paths:
- `@/hooks/useMobile` instead of `@/hooks/use-mobile`
- `@/lib/core/logger` instead of `@/lib/logger`
- `@/lib/scryfall` already re-exports correctly

#### 3. Request Queue Memory Growth
**File**: `src/lib/scryfall/client.ts` (lines 31-33, 73-81)

```typescript
const requestQueue: QueuedRequest[] = [];
const MAX_QUEUE_SIZE = 50;
```

**Issue**: While there is a `MAX_QUEUE_SIZE` check, requests that throw errors still consume queue space until resolved. Under sustained high load with failures, the queue could fill up and reject legitimate requests.

**Recommendation**: Add automatic queue cleanup for failed requests or implement a timeout for queued items.

### Medium Priority

#### 4. Duplicate Cache Key Generation Logic
**Files**: 
- `src/components/UnifiedSearchBar.tsx` (lines 47-54)
- `src/hooks/useSearchQuery.ts` (lines 69-76)
- `supabase/functions/semantic-search/cache.ts` (lines 20-28)

All three files implement similar `normalizeQueryKey` / `getCacheKey` functions.

**Recommendation**: Extract to a shared utility and ensure consistency across client and server.

#### 5. Missing Request Abort in Flight Navigation
**File**: `src/components/UnifiedSearchBar.tsx`

The `AbortController` is used but browser navigation or component unmount may not properly cancel in-flight requests in all cases.

**Recommendation**: Add cleanup in `useEffect` to abort pending requests on unmount:
```typescript
useEffect(() => {
  return () => {
    abortControllerRef.current?.abort();
  };
}, []);
```

#### 6. Hardcoded Affiliate Base Check
**File**: `src/components/CardModal.tsx` (line 131)

```typescript
const affiliateBase = import.meta.env.NEXT_PUBLIC_TCGPLAYER_IMPACT_BASE;
```

**Issue**: Uses `NEXT_PUBLIC_` prefix which is Next.js convention, but this is a Vite project. Should use `VITE_` prefix.

**Recommendation**: Update to `VITE_TCGPLAYER_IMPACT_BASE` or check if this is intentionally unsupported.

### Low Priority

#### 7. Deterministic.ts File Size
**File**: `supabase/functions/semantic-search/deterministic.ts` (1633+ lines)

This file contains extensive mappings (keywords, archetypes, slang, card-like patterns). While functional, it could be split into:
- `mappings/keywords.ts`
- `mappings/archetypes.ts`
- `mappings/slang.ts`
- `mappings/cards-like.ts`

#### 8. Console Logging in Production Monitoring
**File**: `src/lib/core/monitoring.ts`

Currently uses `console.*` calls as placeholders. Consider adding a flag to disable in production or integrate with a real monitoring service.

#### 9. Deprecated Files Still Present

Seven deprecated re-export files exist. While they maintain backward compatibility, they add cognitive overhead:
- `src/lib/logger.ts`
- `src/lib/pwa.ts`
- `src/lib/utils.ts`
- `src/lib/queryFilters.ts`
- `src/lib/scryfall.ts`
- `src/lib/card-printings.ts`
- `src/hooks/use-mobile.tsx`

---

## Security Assessment

### Strengths
1. **Input sanitization**: Query length limits (500 chars), HTML stripping, spam detection
2. **Multi-layer rate limiting**: Session (20/min) + IP (30/min) + Global (1000/min)
3. **No secret exposure**: API keys are server-side only via Lovable Cloud secrets
4. **CORS handling**: Proper preflight handling in edge functions
5. **Error sanitization**: File paths and sensitive details stripped from error messages

### Recommendations
1. Add Content Security Policy headers in production
2. Validate that all RLS policies on database tables are properly restrictive
3. Consider adding request signing for analytics events to prevent spoofing

---

## Performance Observations

| Metric | Value | Notes |
|--------|-------|-------|
| Virtualization threshold | 50 cards | Good balance |
| Search debounce | 300ms | Appropriate |
| Client cache TTL | 30 minutes | Cost-effective |
| Persistent cache TTL | 48 hours | Good for popular queries |
| Card search stale time | 5 minutes | Fresh enough for price changes |
| Translation stale time | 24 hours | Reasonable for stable translations |
| Progress animation | 500ms ease-out | Smooth UX |
| Infinite scroll margin | 200px | Good pre-fetching buffer |

---

## Technical Debt Summary

| Item | Priority | Effort | Impact |
|------|----------|--------|--------|
| Fix interval cleanup in serverless | High | Low | Reliability |
| Update deprecated imports | High | Low | Maintainability |
| Consolidate cache key logic | Medium | Low | Consistency |
| Add request abort cleanup | Medium | Low | Resource management |
| Fix affiliate env var prefix | Low | Minimal | Configuration correctness |
| Split deterministic.ts | Low | Medium | Maintainability |
| Remove deprecated files | Low | Low | Code cleanliness |

---

## Conclusion

OffMeta has evolved into a well-engineered application with thoughtful architecture. The improvements since the last review (CardModal decomposition, snapshot tests, golden tests, benchmark improvements) demonstrate commitment to quality.

**Key recommendations for next iteration:**
1. Address the serverless interval cleanup issue
2. Standardize imports to canonical paths
3. Consider extracting shared cache key logic
4. Continue expanding golden test coverage for edge cases

The codebase follows React best practices, has comprehensive TypeScript coverage, and handles edge cases gracefully. The multi-layer caching strategy and circuit breaker pattern show mature production thinking.

