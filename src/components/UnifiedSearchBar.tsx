/**
 * Unified search bar component for natural language MTG card search.
 * Includes debouncing, rate limit handling, and timeout protection.
 */

import {
  useState,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Loader2, X, Clock, History } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { SearchFeedback } from '@/components/SearchFeedback';
import { SearchHelpModal } from '@/components/SearchHelpModal';
import type { FilterState } from '@/types/filters';
import type { SearchIntent } from '@/types/search';
import { logger } from '@/lib/logger';

const SEARCH_CONTEXT_KEY = 'lastSearchContext';
const SEARCH_HISTORY_KEY = 'offmeta_search_history';
const RESULT_CACHE_KEY = 'offmeta_result_cache_v2'; // Bump version to invalidate old caches
const MAX_HISTORY_ITEMS = 5;
const SEARCH_TIMEOUT_MS = 15000; // 15 second timeout
const RESULT_CACHE_TTL = 30 * 60 * 1000; // 30 minute cache for results (cost optimization)
const MAX_CACHE_SIZE = 50;

// Client-side result caching to prevent duplicate edge function calls
interface CachedResult {
  scryfallQuery: string;
  explanation?: {
    readable: string;
    assumptions: string[];
    confidence: number;
  };
  showAffiliate?: boolean;
  validationIssues?: string[];
  intent?: SearchIntent;
  timestamp: number;
}

function normalizeQueryKey(
  query: string,
  filters?: FilterState | null,
  cacheSalt?: string,
): string {
  const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
  return `${normalized}|${JSON.stringify(filters || {})}|${cacheSalt || ''}`;
}

function getCachedResult(
  query: string,
  filters?: FilterState | null,
  cacheSalt?: string,
): CachedResult | null {
  try {
    const cache = JSON.parse(sessionStorage.getItem(RESULT_CACHE_KEY) || '{}');
    const key = normalizeQueryKey(query, filters, cacheSalt);
    const cached = cache[key];
    if (cached && Date.now() - cached.timestamp < RESULT_CACHE_TTL) {
      return cached;
    }
    // Clean up expired entry
    if (cached) {
      delete cache[key];
      sessionStorage.setItem(RESULT_CACHE_KEY, JSON.stringify(cache));
    }
  } catch {
    // Ignore storage/cache failures.
  }
  return null;
}

function setCachedResult(
  query: string,
  result: Omit<CachedResult, 'timestamp'>,
  filters?: FilterState | null,
  cacheSalt?: string,
): void {
  try {
    const cache = JSON.parse(sessionStorage.getItem(RESULT_CACHE_KEY) || '{}');
    const key = normalizeQueryKey(query, filters, cacheSalt);
    cache[key] = { ...result, timestamp: Date.now() };
    // Limit cache size - remove oldest entries
    const keys = Object.keys(cache);
    if (keys.length > MAX_CACHE_SIZE) {
      const sorted = keys.sort(
        (a, b) => cache[a].timestamp - cache[b].timestamp,
      );
      sorted
        .slice(0, keys.length - MAX_CACHE_SIZE)
        .forEach((k) => delete cache[k]);
    }
    sessionStorage.setItem(RESULT_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage/cache failures.
  }
}

interface SearchContext {
  previousQuery: string;
  previousScryfall: string;
}

function useSearchContext() {
  const [context, setContext] = useState<SearchContext | null>(null);

  const saveContext = useCallback((query: string, scryfall: string) => {
    const newContext = { previousQuery: query, previousScryfall: scryfall };
    setContext(newContext);
    try {
      sessionStorage.setItem(SEARCH_CONTEXT_KEY, JSON.stringify(newContext));
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const getContext = useCallback(() => context, [context]);

  return { saveContext, getContext };
}

function useSearchHistory() {
  const [history, setHistory] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const addToHistory = useCallback((query: string) => {
    if (!query.trim()) return;
    setHistory((prev) => {
      const filtered = prev.filter(
        (q) => q.toLowerCase() !== query.toLowerCase(),
      );
      const updated = [query, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage failures.
      }
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch {
      // Ignore storage failures.
    }
  }, []);

  return { history, addToHistory, clearHistory };
}

export interface SearchResult {
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

interface UnifiedSearchBarProps {
  onSearch: (
    query: string,
    result?: SearchResult,
    naturalQuery?: string,
  ) => void;
  isLoading: boolean;
  lastTranslatedQuery?: string;
  filters?: FilterState | null;
}

export interface UnifiedSearchBarHandle {
  triggerSearch: (
    query: string,
    options?: { bypassCache?: boolean; cacheSalt?: string },
  ) => void;
}

const EXAMPLE_QUERIES = [
  'creatures that make treasure tokens',
  'cheap green ramp spells',
  'artifacts that produce 2 mana',
];

export const UnifiedSearchBar = forwardRef<
  UnifiedSearchBarHandle,
  UnifiedSearchBarProps
>(function UnifiedSearchBar(
  { onSearch, isLoading, lastTranslatedQuery, filters },
  ref,
) {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number>(0);
  const [useLast, setUseLast] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSearchRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestTokenRef = useRef(0);
  const { saveContext, getContext } = useSearchContext();
  const { history, addToHistory, clearHistory } = useSearchHistory();
  const canUseLast = Boolean(getContext());

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

      // Prevent empty, duplicate, or rate-limited searches
      if (!queryToSearch) return;
      if (rateLimitedUntil && Date.now() < rateLimitedUntil) {
        toast.error('Please wait', {
          description: `Rate limited. Try again in ${rateLimitCountdown}s`,
        });
        return;
      }

      lastSearchRef.current = queryToSearch;
      addToHistory(queryToSearch);

      const currentToken = ++requestTokenRef.current;
      const allowReuse = useLast && !options?.bypassCache;
      setUseLast(false);
      const cacheSalt = options?.cacheSalt;

      // Check client-side cache first (eliminates edge function call entirely)
      const cached = allowReuse
        ? getCachedResult(queryToSearch, filters, cacheSalt)
        : null;
      if (cached) {
        logger.info('[Cache] Client-side hit for:', queryToSearch);
        saveContext(queryToSearch, cached.scryfallQuery);
        onSearch(
          cached.scryfallQuery,
          {
            scryfallQuery: cached.scryfallQuery,
            explanation: cached.explanation,
            showAffiliate: cached.showAffiliate,
            validationIssues: cached.validationIssues,
            intent: cached.intent,
            source: 'client_cache',
          },
          queryToSearch,
        ); // Pass natural language query
        toast.success('Search (cached)', {
          description: `Found: ${cached.scryfallQuery.substring(0, 50)}${cached.scryfallQuery.length > 50 ? '...' : ''}`,
        });
        return;
      }

      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsSearching(true);

      // Timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('Search timeout')),
          SEARCH_TIMEOUT_MS,
        );
      });

      try {
        const context = allowReuse ? getContext() : null;

        const searchPromise = supabase.functions.invoke('semantic-search', {
          body: {
            query: queryToSearch,
            context: context || undefined,
            useCache: allowReuse,
            filters: filters || undefined,
            cacheSalt: cacheSalt || undefined,
          },
        });

        const { data, error } = await Promise.race([
          searchPromise,
          timeoutPromise,
        ]);

        if (error) throw error;
        if (requestTokenRef.current !== currentToken) {
          return;
        }

        // Handle rate limiting response
        if (data?.retryAfter) {
          const retryAfterMs = (data.retryAfter || 30) * 1000;
          setRateLimitedUntil(Date.now() + retryAfterMs);
          toast.error('Too many searches', {
            description: `High traffic - retry in ${data.retryAfter}s`,
            icon: <Clock className="h-4 w-4" />,
          });
          return;
        }

        if (data?.success && data?.scryfallQuery) {
          saveContext(queryToSearch, data.scryfallQuery);

          // Cache the result client-side for 15 minutes
          setCachedResult(
            queryToSearch,
            {
              scryfallQuery: data.scryfallQuery,
              explanation: data.explanation,
              showAffiliate: data.showAffiliate,
              validationIssues: data.validationIssues,
              intent: data.intent,
            },
            filters,
            cacheSalt,
          );

          onSearch(
            data.scryfallQuery,
            {
              scryfallQuery: data.scryfallQuery,
              explanation: data.explanation,
              showAffiliate: data.showAffiliate,
              validationIssues: data.validationIssues,
              intent: data.intent,
              source: data.source || 'ai',
            },
            queryToSearch,
          ); // Pass natural language query

          const source = data.source || 'ai';
          toast.success(
            `Search translated${source !== 'ai' ? ` (${source})` : ''}`,
            {
              description: `Found: ${data.scryfallQuery.substring(0, 50)}${data.scryfallQuery.length > 50 ? '...' : ''}`,
            },
          );
        } else {
          throw new Error(data?.error || 'Failed to translate');
        }
      } catch (error: unknown) {
        // Handle different error types
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (requestTokenRef.current !== currentToken) {
          return;
        }
        if (errorMessage === 'Search timeout') {
          logger.error('Search timeout');
          toast.error('Search took too long', {
            description: 'Try a simpler query or try again',
          });
          onSearch(queryToSearch, undefined, queryToSearch); // Fall back to direct search
        } else if (
          errorMessage.includes('429') ||
          errorMessage.includes('rate')
        ) {
          setRateLimitedUntil(Date.now() + 30000);
          toast.error('Too many searches', {
            description: 'Please wait a moment before searching again',
          });
        } else {
          logger.error('Search error:', error);
          toast.error('Search issue', {
            description: 'Trying direct search instead',
          });
          onSearch(queryToSearch, undefined, queryToSearch);
        }
      } finally {
        setIsSearching(false);
        abortControllerRef.current = null;
      }
    },
    [
      addToHistory,
      filters,
      getContext,
      onSearch,
      query,
      rateLimitCountdown,
      rateLimitedUntil,
      saveContext,
      useLast,
    ],
  );

  useImperativeHandle(
    ref,
    () => ({
      triggerSearch: (
        searchQuery: string,
        options?: { bypassCache?: boolean; cacheSalt?: string },
      ) => {
        setQuery(searchQuery);
        handleSearch(searchQuery, options);
      },
    }),
    [handleSearch],
  );

  const showExamples = !query;

  return (
    <search
      className="space-y-4 sm:space-y-6 w-full mx-auto px-0"
      style={{ maxWidth: 'clamp(320px, 90vw, 672px)' }}
      role="search"
      aria-label="Card search"
    >
      {/* Search input - Mobile-first, two-row layout on mobile */}
      <div className="relative space-y-2">
        {/* Primary row: Input + Search button */}
        <div
          className={`
            relative flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-xl border bg-card
            transition-all duration-200
            ${
              isFocused
                ? 'border-foreground/20 shadow-lg ring-2 ring-ring ring-offset-2 ring-offset-background'
                : 'border-border shadow-sm hover:border-muted-foreground/30 hover:shadow-md'
            }
          `}
        >
          <label htmlFor="search-input" className="sr-only">
            Search for Magic cards using natural language
          </label>

          <div
            className="hidden sm:flex items-center justify-center w-10 h-10 rounded-lg bg-secondary text-muted-foreground flex-shrink-0"
            aria-hidden="true"
          >
            <Search className="h-4 w-4" />
          </div>

          <input
            ref={inputRef}
            id="search-input"
            type="search"
            placeholder={
              isMobile
                ? 'Search cards...'
                : "Describe what you're looking for..."
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="flex-1 min-w-0 bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none py-2 px-2 sm:px-1"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            aria-describedby="search-hint"
          />

          {query && (
            <button
              aria-label="Clear search"
              className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-muted-foreground hover:text-foreground flex-shrink-0 rounded-lg hover:bg-secondary transition-colors"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

          <Button
            onClick={() => handleSearch()}
            disabled={
              isSearching ||
              isLoading ||
              !query.trim() ||
              rateLimitCountdown > 0
            }
            variant="accent"
            size="sm"
            className="h-9 sm:h-10 px-3 sm:px-4 rounded-lg gap-1.5 sm:gap-2 font-medium flex-shrink-0"
            aria-label={
              rateLimitCountdown > 0
                ? `Wait ${rateLimitCountdown}s`
                : isSearching
                  ? 'Searching...'
                  : 'Search for cards'
            }
          >
            {rateLimitCountdown > 0 ? (
              <>
                <Clock className="h-4 w-4" aria-hidden="true" />
                <span className="text-xs">{rateLimitCountdown}s</span>
              </>
            ) : isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <>
                <Search className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Search</span>
              </>
            )}
          </Button>

          {/* Desktop-only inline buttons */}
          <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
            <SearchFeedback
              originalQuery={query || history[0] || ''}
              translatedQuery={lastTranslatedQuery}
            />
            <Button
              variant={useLast ? 'accent' : 'ghost'}
              size="sm"
              onClick={() => setUseLast((prev) => !prev)}
              className="h-8 px-2 text-xs"
              title="Reuse the last interpretation and cache (optional)"
              disabled={!canUseLast}
            >
              {useLast ? 'Using last' : 'Use last'}
            </Button>
            <SearchHelpModal
              onTryExample={(exampleQuery) => {
                setQuery(exampleQuery);
                handleSearch(exampleQuery);
              }}
            />
          </div>
        </div>

        {/* Secondary row: Mobile-only auxiliary actions */}
        <div className="flex sm:hidden items-center justify-center gap-2 flex-wrap">
          <SearchFeedback
            originalQuery={query || history[0] || ''}
            translatedQuery={lastTranslatedQuery}
          />
          <Button
            variant={useLast ? 'accent' : 'ghost'}
            size="sm"
            onClick={() => setUseLast((prev) => !prev)}
            className="h-9 min-w-[44px] px-3 text-xs gap-1.5"
            title="Reuse the last interpretation"
            disabled={!canUseLast}
          >
            <History className="h-3.5 w-3.5" aria-hidden="true" />
            {useLast ? 'Using last' : 'Reuse'}
          </Button>
          <SearchHelpModal
            onTryExample={(exampleQuery) => {
              setQuery(exampleQuery);
              handleSearch(exampleQuery);
            }}
          />
        </div>

        <p id="search-hint" className="sr-only">
          Type your search query and press Enter or click Search
        </p>
      </div>

      {/* Suggestions: recent searches + examples in a single row */}
      {showExamples && (
        <div
          className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 animate-reveal"
          role="group"
          aria-label="Search suggestions"
        >
          {/* Recent searches first */}
          {history.length > 0 && (
            <>
              {history.slice(0, isMobile ? 1 : 2).map((historyQuery, index) => (
                <button
                  key={`history-${historyQuery}-${index}`}
                  onClick={() => {
                    setQuery(historyQuery);
                    handleSearch(historyQuery);
                  }}
                  className="group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-border/60 bg-card/50 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/20 hover:bg-secondary/50 transition-all duration-200 focus-ring"
                  aria-label={`Search for ${historyQuery}`}
                >
                  <Clock
                    className="h-3 w-3 opacity-50 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span className="truncate max-w-[100px] sm:max-w-[140px]">
                    {historyQuery}
                  </span>
                </button>
              ))}
              <button
                onClick={clearHistory}
                aria-label="Clear search history"
                className="p-1.5 rounded-full text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors focus-ring"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </>
          )}
          {/* Example queries - trigger search on click */}
          {EXAMPLE_QUERIES.slice(0, isMobile ? 1 : 2).map((example) => (
            <button
              key={example}
              onClick={() => {
                setQuery(example);
                handleSearch(example);
              }}
              className="px-2.5 py-1.5 rounded-full text-xs text-muted-foreground/70 hover:text-foreground hover:bg-secondary/50 transition-all duration-200 focus-ring"
              aria-label={`Search for ${example}`}
            >
              {isMobile && example.length > 20
                ? `${example.slice(0, 20)}…`
                : example}
            </button>
          ))}
        </div>
      )}
    </search>
  );
});
