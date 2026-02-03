/**
 * Custom hooks for search functionality using TanStack Query.
 * Provides request deduplication, prefetching, and optimized caching.
 */

import { useEffect, useRef } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { searchCards } from '@/lib/scryfall/client';
import type { ScryfallCard } from '@/types/card';
import type { FilterState } from '@/types/filters';
import type { SearchIntent } from '@/types/search';

// Popular queries to prefetch for faster UX
const POPULAR_QUERIES_TO_PREFETCH = [
  'mana rocks',
  'board wipes',
  'mana dorks',
  'counterspells',
  'card draw',
];

// Cache durations
const TRANSLATION_STALE_TIME = 24 * 60 * 60 * 1000; // 24 hours
const CARD_SEARCH_STALE_TIME = 5 * 60 * 1000; // 5 minutes

// Session-level rate limiting to prevent spam loops
const SEARCH_RATE_LIMIT = {
  maxPerMinute: 20,
  cooldownMs: 2000, // 2 second cooldown between identical searches
};

// Track recent searches for rate limiting
const recentSearches = new Map<string, number>(); // query -> timestamp
let searchCountThisMinute = 0;
let minuteWindowStart = Date.now();

export interface TranslationResult {
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
  if (searchCountThisMinute >= SEARCH_RATE_LIMIT.maxPerMinute) {
    return {
      allowed: false,
      reason: 'Too many searches. Please wait a moment.',
    };
  }

  // Check cooldown for identical searches
  const lastSearchTime = recentSearches.get(normalizedQuery);
  if (lastSearchTime && now - lastSearchTime < SEARCH_RATE_LIMIT.cooldownMs) {
    return { allowed: false, reason: 'Please wait before searching again.' };
  }

  // Update tracking
  searchCountThisMinute++;
  recentSearches.set(normalizedQuery, now);

  // Cleanup old entries (keep last 50)
  if (recentSearches.size > 50) {
    const oldest = Array.from(recentSearches.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, 25);
    oldest.forEach(([key]) => recentSearches.delete(key));
  }

  return { allowed: true };
}

/**
 * Core translation function with deduplication and rate limiting
 */
async function translateQueryWithDedup(
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
    return pendingTranslations.get(key)!;
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
          },
        },
      );

      if (error) throw error;

      if (data?.success && data?.scryfallQuery) {
        return {
          scryfallQuery: data.scryfallQuery,
          explanation: data.explanation,
          showAffiliate: data.showAffiliate,
          validationIssues: data.validationIssues,
          intent: data.intent,
          source: data.source || 'ai',
        };
      }

      throw new Error(data?.error || 'Translation failed');
    } finally {
      // Clean up pending request
      pendingTranslations.delete(key);
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
    staleTime: TRANSLATION_STALE_TIME,
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

    // Prefetch after a short delay to not block initial render
    const timeoutId = setTimeout(() => {
      POPULAR_QUERIES_TO_PREFETCH.forEach((query) => {
        queryClient.prefetchQuery({
          queryKey: ['translation', query, null, undefined],
          queryFn: () =>
            translateQueryWithDedup({
              query,
              filters: null,
              bypassCache: false,
            }),
          staleTime: TRANSLATION_STALE_TIME,
        });
      });
    }, 2000);

    return () => clearTimeout(timeoutId);
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

/**
 * Hook to get card details by ID.
 * Useful for card modal when we need fresh/complete data.
 */
export function useCardDetails(cardId: string | null) {
  return useQuery({
    queryKey: ['card', cardId],
    queryFn: async () => {
      if (!cardId) return null;
      const response = await fetch(`https://api.scryfall.com/cards/${cardId}`);
      if (!response.ok) throw new Error('Failed to fetch card');
      return response.json() as Promise<ScryfallCard>;
    },
    enabled: !!cardId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook for searching cards with optimized caching.
 * Wraps the existing searchCards function with TanStack Query.
 */
export function useCardSearch(scryfallQuery: string | null) {
  return useQuery({
    queryKey: ['cards-search', scryfallQuery],
    queryFn: () => searchCards(scryfallQuery!, 1),
    enabled: !!scryfallQuery,
    staleTime: CARD_SEARCH_STALE_TIME,
    placeholderData: (previousData) => previousData, // Show stale data while fetching
  });
}

/**
 * Utility to invalidate translation cache for a specific query.
 */
export function invalidateTranslationCache(
  queryClient: QueryClient,
  query: string,
) {
  queryClient.invalidateQueries({
    queryKey: ['translation', query],
  });
}

/**
 * Utility to set translation result in cache manually.
 * Useful when we receive translation from other sources.
 */
export function setTranslationCache(
  queryClient: QueryClient,
  query: string,
  result: TranslationResult,
  filters?: FilterState | null,
) {
  queryClient.setQueryData(['translation', query, filters, undefined], result);
}
