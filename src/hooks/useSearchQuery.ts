/**
 * Custom hooks for search functionality using TanStack Query.
 * Provides request deduplication, prefetching, and optimized caching.
 */

import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FilterState } from '@/types/filters';
import type { SearchIntent } from '@/types/search';
import { CLIENT_CONFIG } from '@/lib/config';
import { logger } from '@/lib/core/logger';

// Hardcoded fallback queries if DB fetch fails
const FALLBACK_POPULAR_QUERIES = ['mana rocks', 'board wipes'];

// Track recent searches for rate limiting
const recentSearches = new Map<string, number>(); // query -> timestamp
let searchCountThisMinute = 0;
let minuteWindowStart = Date.now();

export interface TranslationResult {
  edgeSource?: string;
  edgeResponseTimeMs?: number;
  scryfallQuery: string;
  explanation?: {
    readable: string;
    assumptions: string[];
    confidence: number;
  };
  showAffiliate?: boolean;
  validationIssues?: string[];
  intent?: SearchIntent;
  source?: string;
}

interface TranslationParams {
  query: string;
  filters?: FilterState | null;
  cacheSalt?: string;
  bypassCache?: boolean;
}

// Request deduplication map for in-flight requests
const pendingTranslations = new Map<string, Promise<TranslationResult>>();

const CROSS_TAB_RESULT_TTL_MS = 5000;

interface TranslationChannelMessage {
  type: 'translation_started' | 'translation_result';
  key: string;
  result?: TranslationResult;
}

const crossTabPendingKeys = new Set<string>();
const crossTabResults = new Map<
  string,
  { result: TranslationResult; timestamp: number }
>();
const crossTabWaiters = new Map<
  string,
  Array<(result: TranslationResult) => void>
>();

const translationBroadcastChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('offmeta-translation-dedup')
    : null;

translationBroadcastChannel?.addEventListener(
  'message',
  (event: MessageEvent<TranslationChannelMessage>) => {
    const message = event.data;
    if (!message?.key) return;

    if (message.type === 'translation_started') {
      crossTabPendingKeys.add(message.key);
      return;
    }

    if (message.type === 'translation_result' && message.result) {
      crossTabPendingKeys.delete(message.key);
      crossTabResults.set(message.key, {
        result: message.result,
        timestamp: Date.now(),
      });

      const waiters = crossTabWaiters.get(message.key);
      if (waiters) {
        waiters.forEach((resolve) =>
          resolve(message.result as TranslationResult),
        );
        crossTabWaiters.delete(message.key);
      }
    }
  },
);

function getRecentCrossTabResult(key: string): TranslationResult | null {
  const entry = crossTabResults.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CROSS_TAB_RESULT_TTL_MS) {
    crossTabResults.delete(key);
    return null;
  }
  return entry.result;
}

function waitForCrossTabResult(
  key: string,
  timeoutMs: number,
): Promise<TranslationResult | null> {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      const waiters = crossTabWaiters.get(key);
      if (!waiters) {
        resolve(null);
        return;
      }

      const remaining = waiters.filter(
        (waiter) => waiter !== resolveWithResult,
      );
      if (remaining.length > 0) {
        crossTabWaiters.set(key, remaining);
      } else {
        crossTabWaiters.delete(key);
      }
      resolve(null);
    }, timeoutMs);

    const resolveWithResult = (result: TranslationResult) => {
      clearTimeout(timeoutId);
      resolve(result);
    };

    const existing = crossTabWaiters.get(key) ?? [];
    existing.push(resolveWithResult);
    crossTabWaiters.set(key, existing);
  });
}

/**
 * Generate a cache key for translation requests
 */
function getTranslationKey(
  query: string,
  filters?: FilterState | null,
  cacheSalt?: string,
): string {
  const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
  return `translation:${normalized}|${JSON.stringify(filters || {})}|${cacheSalt || ''}`;
}

/**
 * Check if we're rate limited for searches
 */
function checkSearchRateLimit(query: string): {
  allowed: boolean;
  reason?: string;
} {
  const now = Date.now();
  const normalizedQuery = query.toLowerCase().trim();

  // Reset minute window if expired
  if (now - minuteWindowStart > 60000) {
    searchCountThisMinute = 0;
    minuteWindowStart = now;
  }

  // Check max searches per minute
  if (searchCountThisMinute >= CLIENT_CONFIG.SEARCH_RATE_LIMIT.maxPerMinute) {
    return {
      allowed: false,
      reason: 'Too many searches. Please wait a moment.',
    };
  }

  // Check cooldown for identical searches — only block if called multiple times in <500ms
  // (dedup handles the rest via pendingTranslations)
  const lastSearchTime = recentSearches.get(normalizedQuery);
  if (lastSearchTime && now - lastSearchTime < 500) {
    return {
      allowed: false,
      reason: 'Rate limited: please wait before searching again.',
    };
  }

  return { allowed: true };
}

/**
 * Record a successful search for rate limiting tracking
 */
function recordSearch(query: string): void {
  const normalizedQuery = query.toLowerCase().trim();
  searchCountThisMinute++;
  recentSearches.set(normalizedQuery, Date.now());

  // Cleanup old entries (keep last 50)
  if (recentSearches.size > 50) {
    const oldest = Array.from(recentSearches.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, 25);
    oldest.forEach(([key]) => recentSearches.delete(key));
  }
}

/**
 * Core translation function with deduplication and rate limiting
 */
export async function translateQueryWithDedup(
  params: TranslationParams,
): Promise<TranslationResult> {
  const { query, filters, cacheSalt, bypassCache } = params;
  const key = getTranslationKey(query, filters, cacheSalt);

  // Check rate limit (skip for cache hits)
  if (!bypassCache) {
    const rateLimit = checkSearchRateLimit(query);
    if (!rateLimit.allowed) {
      throw new Error(rateLimit.reason || 'Rate limit exceeded');
    }
  }

  // Check for pending request with same key
  if (!bypassCache && pendingTranslations.has(key)) {
    logger.info('[SearchDiag] Dedup hit', { query });
    return pendingTranslations.get(key)!;
  }

  if (!bypassCache) {
    const recentCrossTabResult = getRecentCrossTabResult(key);
    if (recentCrossTabResult) {
      logger.info('[SearchDiag] Cross-tab dedup hit', { query });
      return recentCrossTabResult;
    }

    if (crossTabPendingKeys.has(key)) {
      const sharedResult = await waitForCrossTabResult(key, 1500);
      if (sharedResult) {
        logger.info('[SearchDiag] Cross-tab shared result used', { query });
        return sharedResult;
      }
    }

    translationBroadcastChannel?.postMessage({
      type: 'translation_started',
      key,
    } satisfies TranslationChannelMessage);
  }

  const translationPromise = (async () => {
    try {
      // Get session ID for server-side rate limiting
      const sessionId =
        sessionStorage.getItem('offmeta_session_id') ||
        `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

      // Store session ID if not present
      if (!sessionStorage.getItem('offmeta_session_id')) {
        sessionStorage.setItem('offmeta_session_id', sessionId);
      }

      const edgeCallStartedAt = performance.now();
      logger.info('[SearchDiag] Edge function call', { query });
      const requestStart = Date.now();
      const requestDeadline = requestStart + 6000;
      const { data, error } = await supabase.functions.invoke(
        'semantic-search',
        {
          body: {
            query: query.trim(),
            useCache: !bypassCache,
            filters: filters || undefined,
            cacheSalt: cacheSalt || undefined,
          },
          headers: {
            'x-session-id': sessionId,
            'x-request-start': String(requestStart),
            'x-deadline-ms': String(requestDeadline),
          },
        },
      );

      if (error) {
        logger.warn('[SearchDiag] Edge function error', {
          query,
          error: String(error),
        });
        throw error;
      }

      const edgeElapsedMs = Math.round(performance.now() - edgeCallStartedAt);

      if (data?.success && data?.scryfallQuery) {
        // Only count as a search on success (so failures don't eat rate limit)
        recordSearch(query);
        const edgeSource = data.source || 'ai';
        logger.info('[SearchDiag] Translation diagnostics', {
          query,
          edgeSource,
          edgeElapsedMs,
          edgeResponseTimeMs: data.responseTimeMs ?? null,
        });

        const result: TranslationResult = {
          scryfallQuery: data.scryfallQuery,
          explanation: data.explanation,
          showAffiliate: data.showAffiliate,
          validationIssues: data.validationIssues,
          intent: data.intent,
          source: edgeSource,
          edgeSource,
          edgeResponseTimeMs: data.responseTimeMs,
        };

        crossTabResults.set(key, { result, timestamp: Date.now() });
        translationBroadcastChannel?.postMessage({
          type: 'translation_result',
          key,
          result,
        } satisfies TranslationChannelMessage);

        return result;
      }

      throw new Error(data?.error || 'Translation failed');
    } finally {
      // Clean up pending request
      pendingTranslations.delete(key);
      crossTabPendingKeys.delete(key);
    }
  })();

  pendingTranslations.set(key, translationPromise);
  return translationPromise;
}

/**
 * Hook for translating natural language queries to Scryfall syntax.
 * Uses TanStack Query with request deduplication.
 */
export function useTranslateQuery(params: TranslationParams | null) {
  const queryKey = params
    ? ['translation', params.query, params.filters, params.cacheSalt]
    : ['translation', null];

  return useQuery({
    queryKey,
    queryFn: () => translateQueryWithDedup(params!),
    enabled: !!params?.query?.trim(),
    staleTime: CLIENT_CONFIG.TRANSLATION_STALE_TIME_MS,
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}

/**
 * Hook to prefetch popular queries on app load.
 * Improves UX by pre-warming the cache.
 */
export function usePrefetchPopularQueries() {
  const queryClient = useQueryClient();
  const hasPrefetched = useRef(false);

  useEffect(() => {
    if (hasPrefetched.current) return;
    hasPrefetched.current = true;

    // Stagger prefetch requests to avoid competing with user's first search
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];
    POPULAR_QUERIES_TO_PREFETCH.forEach((query, index) => {
      const id = setTimeout(
        () => {
          queryClient.prefetchQuery({
            queryKey: ['translation', query, null, undefined],
            queryFn: () =>
              translateQueryWithDedup({
                query,
                filters: null,
                bypassCache: false,
              }),
            staleTime: CLIENT_CONFIG.TRANSLATION_STALE_TIME_MS,
          });
        },
        8000 + index * 3000,
      ); // Start after 8s (after first interaction window), space 3s apart
      timeoutIds.push(id);
    });

    return () => timeoutIds.forEach(clearTimeout);
  }, [queryClient]);
}

/**
 * Hook for submitting search feedback.
 * Uses TanStack Query mutation with optimistic updates.
 */
export function useSubmitFeedback() {
  return useMutation({
    mutationFn: async (feedback: {
      originalQuery: string;
      translatedQuery: string;
      issueDescription: string;
    }) => {
      const { error } = await supabase.from('search_feedback').insert({
        original_query: feedback.originalQuery,
        translated_query: feedback.translatedQuery,
        issue_description: feedback.issueDescription,
      });

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      // Could invalidate related queries if needed
    },
    retry: 2,
  });
}
