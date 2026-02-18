/**
 * Hook for handling search execution with rate limiting,
 * timeouts, abort control, and fallback logic.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { logger } from '@/lib/core/logger';
import { translateQueryWithDedup, type TranslationResult } from '@/hooks/useSearchQuery';
import { buildClientFallbackQuery } from '@/lib/search/fallback';
import { CLIENT_CONFIG } from '@/lib/config';
import type { FilterState } from '@/types/filters';
import type { SearchResult } from '@/components/UnifiedSearchBar';

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

export function useSearchHandler({
  query,
  filters,
  onSearch,
  addToHistory,
  saveContext,
}: UseSearchHandlerOptions) {
  const [isSearching, setIsSearching] = useState(false);
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
        const responseMs = Date.now() - searchStartTime;
        logger.info('[SearchDiag] Translation success', {
          query: queryToSearch,
          source,
          responseMs,
          scryfallQuery: result.scryfallQuery,
        });

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
            timeoutMs: CLIENT_CONFIG.SEARCH_TIMEOUT_MS,
            responseMs,
            fallbackQuery,
          });
          toast.error('Search took too long', {
            description: 'Using simplified search instead',
          });
          onSearch(fallbackQuery, {
            scryfallQuery: fallbackQuery,
            explanation: {
              readable: `Searching for: ${queryToSearch}`,
              assumptions: ['Search timed out — using simplified translation'],
              confidence: 0.5,
            },
            showAffiliate: false,
            source: 'client_fallback',
          }, queryToSearch);
        } else if (
          errorMessage.includes('429') ||
          errorMessage.includes('rate') ||
          errorMessage.includes('Rate limit') ||
          errorMessage.includes('Please wait')
        ) {
          logger.warn('[SearchDiag] Rate limited', { query: queryToSearch, error: errorMessage });
          setRateLimitedUntil(Date.now() + 30000);
          toast.error('Too many searches', {
            description: 'Please wait a moment before searching again',
          });
        } else {
          const fallbackQuery = buildClientFallbackQuery(queryToSearch);
          logger.warn('[SearchDiag] FALLBACK: error', {
            query: queryToSearch,
            error: errorMessage,
            responseMs,
            fallbackQuery,
          });
          toast.error('Search issue', {
            description: 'Using simplified search instead',
          });
          onSearch(fallbackQuery, {
            scryfallQuery: fallbackQuery,
            explanation: {
              readable: `Searching for: ${queryToSearch}`,
              assumptions: ['AI unavailable — using simplified translation'],
              confidence: 0.5,
            },
            showAffiliate: false,
            source: 'client_fallback',
          }, queryToSearch);
        }
      } finally {
        setIsSearching(false);
        abortControllerRef.current = null;
      }
    },
    [
      addToHistory,
      filters,
      onSearch,
      query,
      rateLimitedUntil,
      saveContext,
    ],
  );

  return {
    isSearching,
    rateLimitCountdown,
    handleSearch,
  };
}
