/**
 * Hook for handling search execution with rate limiting,
 * timeouts, abort control, and fallback logic.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { logger } from '@/lib/core/logger';
import {
  translateQueryWithDedup,
  type TranslationResult,
} from '@/hooks/useSearchQuery';
import { buildClientFallbackQuery } from '@/lib/search/fallback';
import { estimateQueryComplexity } from '@/lib/search/complexity';
import { CLIENT_CONFIG } from '@/lib/config';
import type { FilterState } from '@/types/filters';
import type { SearchResult } from '@/components/UnifiedSearchBar';
import { supabase } from '@/integrations/supabase/client';

export type SearchPhase = 'idle' | 'translating' | 'fetching';

interface UseSearchHandlerOptions {
  query: string;
  filters?: FilterState | null;
  onSearch: (
    query: string,
    result?: SearchResult,
    naturalQuery?: string,
  ) => void;
  addToHistory: (query: string) => void;
  saveContext: (query: string, scryfall: string) => void;
}

/**
 * Fire-and-forget analytics event for fallback tracking.
 * Logs to analytics_events so admins can monitor fallback frequency in production.
 */
function trackFallbackEvent(
  reason: 'timeout' | 'error' | 'rate_limit',
  query: string,
  details: Record<string, unknown>,
): void {
  const sessionId = typeof sessionStorage !== 'undefined'
    ? sessionStorage.getItem('offmeta_session_id')
    : null;

  supabase
    .from('analytics_events')
    .insert({
      event_type: 'search_fallback',
      session_id: sessionId,
      event_data: {
        reason,
        query: query.substring(0, 200),
        ...details,
        timestamp: new Date().toISOString(),
      },
    })
    .then(({ error }) => {
      if (error) {
        logger.warn('[SearchDiag] Failed to track fallback event', { error: String(error) });
      }
    });
}

export function useSearchHandler({
  query,
  filters,
  onSearch,
  addToHistory,
  saveContext,
}: UseSearchHandlerOptions) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchPhase, setSearchPhase] = useState<SearchPhase>('idle');
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number>(0);
  const rateLimitCountdownRef = useRef<number>(0);
  const lastSearchRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestTokenRef = useRef(0);

  // Abort pending requests on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Rate limit countdown timer
  useEffect(() => {
    if (!rateLimitedUntil) {
      setRateLimitCountdown(0);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.ceil((rateLimitedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setRateLimitedUntil(null);
        setRateLimitCountdown(0);
      } else {
        setRateLimitCountdown(remaining);
        rateLimitCountdownRef.current = remaining;
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [rateLimitedUntil]);

  const handleSearch = useCallback(
    async (
      searchQuery?: string,
      options?: { bypassCache?: boolean; cacheSalt?: string },
    ) => {
      const queryToSearch = (searchQuery || query).trim();

      // Prevent empty or rate-limited searches
      if (!queryToSearch) return;
      if (rateLimitedUntil && Date.now() < rateLimitedUntil) {
        toast.error('Please wait', {
          description: `Rate limited. Try again in ${rateLimitCountdownRef.current}s`,
        });
        return;
      }

      lastSearchRef.current = queryToSearch;
      addToHistory(queryToSearch);

      const currentToken = ++requestTokenRef.current;
      const cacheSalt = options?.cacheSalt;

      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsSearching(true);
      setSearchPhase('translating');

      const searchStartTime = Date.now();
      logger.info('[SearchDiag] Search started', {
        query: queryToSearch,
        hasFilters: !!filters,
        bypassCache: !!options?.bypassCache,
      });

      // Timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('Search timeout')),
          CLIENT_CONFIG.SEARCH_TIMEOUT_MS,
        );
      });

      try {
        const translationPromise = translateQueryWithDedup({
          query: queryToSearch,
          filters: filters || undefined,
          cacheSalt: cacheSalt || undefined,
          bypassCache: options?.bypassCache,
        });

        const result: TranslationResult = await Promise.race([
          translationPromise,
          timeoutPromise,
        ]);

        if (requestTokenRef.current !== currentToken) {
          return;
        }

        saveContext(queryToSearch, result.scryfallQuery);

        const source = result.source || 'ai';
        const endToEndElapsedMs = Date.now() - searchStartTime;
        logger.info('[SearchDiag] Search diagnostics', {
          query: queryToSearch,
          edgeSource: result.edgeSource || source,
          endToEndElapsedMs,
          edgeResponseTimeMs: result.edgeResponseTimeMs ?? null,
          scryfallQuery: result.scryfallQuery,
        });

        // Translation done — now card fetch begins
        setSearchPhase('fetching');

        onSearch(
          result.scryfallQuery,
          {
            scryfallQuery: result.scryfallQuery,
            explanation: result.explanation,
            showAffiliate: result.showAffiliate,
            validationIssues: result.validationIssues,
            intent: result.intent,
            source,
          },
          queryToSearch,
        );

        // No success toast — results appearing is sufficient feedback
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (requestTokenRef.current !== currentToken) {
          return;
        }
        const responseMs = Date.now() - searchStartTime;

        if (errorMessage === 'Search timeout') {
          const fallbackQuery = buildClientFallbackQuery(queryToSearch);
          logger.warn('[SearchDiag] FALLBACK: timeout', {
            query: queryToSearch,
            timeoutBehavior: 'fast_timeout',
            timeoutTriggered: true,
            timeoutMs: CLIENT_CONFIG.SEARCH_TIMEOUT_MS,
            endToEndElapsedMs: responseMs,
            fallbackQuery,
          });

          // Track timeout fallback for production monitoring
          trackFallbackEvent('timeout', queryToSearch, {
            timeoutMs: CLIENT_CONFIG.SEARCH_TIMEOUT_MS,
            elapsedMs: responseMs,
            fallbackQuery,
          });

          toast.error('Search took too long', {
            description: `AI translation timed out after ${Math.round(responseMs / 1000)}s — using simplified search. Results may be less precise.`,
          });
          onSearch(
            fallbackQuery,
            {
              scryfallQuery: fallbackQuery,
              explanation: {
                readable: `Searching for: ${queryToSearch}`,
                assumptions: [
                  `AI translation timed out after ${Math.round(responseMs / 1000)}s — using simplified keyword search`,
                ],
                confidence: 0.5,
              },
              showAffiliate: false,
              source: 'client_fallback',
            },
            queryToSearch,
          );
        } else if (
          errorMessage.includes('429') ||
          errorMessage.includes('rate') ||
          errorMessage.includes('Rate limit') ||
          errorMessage.includes('Please wait')
        ) {
          logger.warn('[SearchDiag] Rate limited', {
            query: queryToSearch,
            error: errorMessage,
          });

          trackFallbackEvent('rate_limit', queryToSearch, {
            error: errorMessage,
            elapsedMs: responseMs,
          });

          setRateLimitedUntil(Date.now() + 30000);
          toast.error('Too many searches', {
            description: 'Please wait a moment before searching again',
          });
        } else {
          const fallbackQuery = buildClientFallbackQuery(queryToSearch);
          logger.warn('[SearchDiag] FALLBACK: error', {
            query: queryToSearch,
            error: errorMessage,
            endToEndElapsedMs: responseMs,
            fallbackQuery,
          });

          // Track error fallback for production monitoring
          trackFallbackEvent('error', queryToSearch, {
            error: errorMessage.substring(0, 500),
            elapsedMs: responseMs,
            fallbackQuery,
          });

          toast.error('Search issue', {
            description: `AI translation failed — using simplified search. Try again or refine your query.`,
          });
          onSearch(
            fallbackQuery,
            {
              scryfallQuery: fallbackQuery,
              explanation: {
                readable: `Searching for: ${queryToSearch}`,
                assumptions: [
                  `AI translation error: ${errorMessage.substring(0, 100)} — using simplified keyword search`,
                ],
                confidence: 0.5,
              },
              showAffiliate: false,
              source: 'client_fallback',
            },
            queryToSearch,
          );
        }
      } finally {
        setIsSearching(false);
        setSearchPhase('idle');
        abortControllerRef.current = null;
      }
    },
    [addToHistory, filters, onSearch, query, rateLimitedUntil, saveContext],
  );

  return {
    isSearching,
    searchPhase,
    rateLimitCountdown,
    handleSearch,
  };
}
