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
import { toast } from 'sonner';
import { Search, Loader2, X, Clock } from 'lucide-react';
import { SearchHistoryDropdown } from '@/components/SearchHistoryDropdown';
import { useIsMobile } from '@/hooks/useMobile';
import { SearchFeedback } from '@/components/SearchFeedback';
import { SearchHelpModal } from '@/components/SearchHelpModal';
import type { FilterState } from '@/types/filters';
import type { SearchIntent } from '@/types/search';
import { logger } from '@/lib/core/logger';
import { translateQueryWithDedup, type TranslationResult } from '@/hooks/useSearchQuery';
import { buildClientFallbackQuery } from '@/lib/search/fallback';
import { CLIENT_CONFIG } from '@/lib/config';

const SEARCH_CONTEXT_KEY = 'lastSearchContext';
const SEARCH_HISTORY_KEY = 'offmeta_search_history';

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
      const updated = [query, ...filtered].slice(0, CLIENT_CONFIG.MAX_HISTORY_ITEMS);
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage failures.
      }
      return updated;
    });
  }, []);

  const removeFromHistory = useCallback((queryToRemove: string) => {
    setHistory((prev) => {
      const updated = prev.filter(
        (q) => q.toLowerCase() !== queryToRemove.toLowerCase(),
      );
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

  return { history, addToHistory, removeFromHistory, clearHistory };
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
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number>(0);
  const rateLimitCountdownRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSearchRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestTokenRef = useRef(0);
  const { saveContext, getContext } = useSearchContext();
  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory();

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

      // Timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('Search timeout')),
          CLIENT_CONFIG.SEARCH_TIMEOUT_MS,
        );
      });

      try {
        // Route through the shared translation function (with dedup + rate limiting)
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

        onSearch(
          result.scryfallQuery,
          {
            scryfallQuery: result.scryfallQuery,
            explanation: result.explanation,
            showAffiliate: result.showAffiliate,
            validationIssues: result.validationIssues,
            intent: result.intent,
            source: result.source || 'ai',
          },
          queryToSearch,
        );

        const source = result.source || 'ai';
        toast.success(
          `Search translated${source !== 'ai' ? ` (${source})` : ''}`,
          {
            description: `Found: ${result.scryfallQuery.substring(0, 50)}${result.scryfallQuery.length > 50 ? '...' : ''}`,
          },
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (requestTokenRef.current !== currentToken) {
          return;
        }
        if (errorMessage === 'Search timeout') {
          logger.error('Search timeout');
          const fallbackQuery = buildClientFallbackQuery(queryToSearch);
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
          setRateLimitedUntil(Date.now() + 30000);
          toast.error('Too many searches', {
            description: 'Please wait a moment before searching again',
          });
        } else {
          logger.error('Search error:', error);
          const fallbackQuery = buildClientFallbackQuery(queryToSearch);
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
        {/* Primary row: Input + Search button - wrapped in history dropdown */}
        <SearchHistoryDropdown
          history={history}
          open={showHistoryDropdown}
          onOpenChange={setShowHistoryDropdown}
          onSelectQuery={(selectedQuery) => {
            setQuery(selectedQuery);
            setShowHistoryDropdown(false);
            handleSearch(selectedQuery);
          }}
          onRemoveQuery={removeFromHistory}
          onClearAll={() => {
            clearHistory();
            setShowHistoryDropdown(false);
          }}
        >
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
                  ? 'Describe a card...'
                  : "Describe what you're looking for..."
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setShowHistoryDropdown(false);
                  handleSearch();
                } else if (e.key === 'Escape') {
                  setShowHistoryDropdown(false);
                }
              }}
              onFocus={() => {
                setIsFocused(true);
                if (history.length > 0) {
                  setShowHistoryDropdown(true);
                }
              }}
              onBlur={(e) => {
                setIsFocused(false);
                // Check if focus moved to a dropdown item - don't close if so
                const relatedTarget = e.relatedTarget as HTMLElement | null;
                const isDropdownClick = relatedTarget?.closest('[role="listbox"]');
                if (!isDropdownClick) {
                  // Delay closing to allow clicking dropdown items
                  setTimeout(() => setShowHistoryDropdown(false), 200);
                }
              }}
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
            <SearchHelpModal
              onTryExample={(exampleQuery) => {
                setQuery(exampleQuery);
                handleSearch(exampleQuery);
              }}
            />
          </div>
          </div>
        </SearchHistoryDropdown>

        {/* Secondary row: Mobile-only auxiliary actions */}
        <div className="flex sm:hidden items-center justify-center gap-2 flex-wrap">
          <SearchFeedback
            originalQuery={query || history[0] || ''}
            translatedQuery={lastTranslatedQuery}
          />
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

      {/* Example queries - shown when no query typed */}
      {showExamples && (
        <div
          className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 animate-reveal"
          role="group"
          aria-label="Example searches"
        >
          {EXAMPLE_QUERIES.slice(0, isMobile ? 2 : 3).map((example) => (
            <button
              key={example}
              onClick={() => {
                setQuery(example);
                handleSearch(example);
              }}
              className="px-3 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground border border-border/60 hover:border-border hover:bg-secondary/50 transition-all duration-200 focus-ring"
              aria-label={`Search for ${example}`}
            >
              {isMobile && example.length > 25
                ? `${example.slice(0, 25)}…`
                : example}
            </button>
          ))}
        </div>
      )}
    </search>
  );
});
