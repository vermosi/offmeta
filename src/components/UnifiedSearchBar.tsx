/**
 * Unified search bar component for natural language MTG card search.
 * Includes debouncing, rate limit handling, and timeout protection.
 */

import { useState, useRef, useCallback, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Loader2, X, ArrowRight, History, Clock } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { SearchFeedback } from '@/components/SearchFeedback';
import { SearchHelpModal } from '@/components/SearchHelpModal';

const SEARCH_CONTEXT_KEY = 'lastSearchContext';
const SEARCH_HISTORY_KEY = 'offmeta_search_history';
const RESULT_CACHE_KEY = 'offmeta_result_cache';
const MAX_HISTORY_ITEMS = 5;
const SEARCH_TIMEOUT_MS = 15000; // 15 second timeout
const RESULT_CACHE_TTL = 15 * 60 * 1000; // 15 minute cache for results
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
  timestamp: number;
}

function normalizeQueryKey(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

function getCachedResult(query: string): CachedResult | null {
  try {
    const cache = JSON.parse(sessionStorage.getItem(RESULT_CACHE_KEY) || '{}');
    const key = normalizeQueryKey(query);
    const cached = cache[key];
    if (cached && Date.now() - cached.timestamp < RESULT_CACHE_TTL) {
      return cached;
    }
    // Clean up expired entry
    if (cached) {
      delete cache[key];
      sessionStorage.setItem(RESULT_CACHE_KEY, JSON.stringify(cache));
    }
  } catch {}
  return null;
}

function setCachedResult(query: string, result: Omit<CachedResult, 'timestamp'>): void {
  try {
    const cache = JSON.parse(sessionStorage.getItem(RESULT_CACHE_KEY) || '{}');
    const key = normalizeQueryKey(query);
    cache[key] = { ...result, timestamp: Date.now() };
    // Limit cache size - remove oldest entries
    const keys = Object.keys(cache);
    if (keys.length > MAX_CACHE_SIZE) {
      const sorted = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp);
      sorted.slice(0, keys.length - MAX_CACHE_SIZE).forEach(k => delete cache[k]);
    }
    sessionStorage.setItem(RESULT_CACHE_KEY, JSON.stringify(cache));
  } catch {}
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
    } catch {}
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
    setHistory(prev => {
      const filtered = prev.filter(q => q.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch {}
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
}

interface UnifiedSearchBarProps {
  onSearch: (query: string, result?: SearchResult) => void;
  isLoading: boolean;
  lastTranslatedQuery?: string;
}

export interface UnifiedSearchBarHandle {
  triggerSearch: (query: string) => void;
}

const EXAMPLE_QUERIES = [
  "creatures that make treasure tokens",
  "cheap green ramp spells",
  "cards that double ETB effects",
  "Rakdos sacrifice outlets",
];

export const UnifiedSearchBar = forwardRef<UnifiedSearchBarHandle, UnifiedSearchBarProps>(
  function UnifiedSearchBar({ onSearch, isLoading, lastTranslatedQuery }, ref) {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSearchRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const { saveContext, getContext } = useSearchContext();
  const { history, addToHistory, clearHistory } = useSearchHistory();

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

  useImperativeHandle(ref, () => ({
    triggerSearch: (searchQuery: string) => {
      setQuery(searchQuery);
      handleSearch(searchQuery);
    }
  }), []);

  const handleSearch = async (searchQuery?: string) => {
    const queryToSearch = (searchQuery || query).trim();
    
    // Prevent empty, duplicate, or rate-limited searches
    if (!queryToSearch) return;
    if (queryToSearch === lastSearchRef.current && !searchQuery) return;
    if (rateLimitedUntil && Date.now() < rateLimitedUntil) {
      toast.error('Please wait', {
        description: `Rate limited. Try again in ${rateLimitCountdown}s`
      });
      return;
    }
    
    lastSearchRef.current = queryToSearch;
    addToHistory(queryToSearch);
    
    // Check client-side cache first (eliminates edge function call entirely)
    const cached = getCachedResult(queryToSearch);
    if (cached) {
      console.log('[Cache] Client-side hit for:', queryToSearch);
      saveContext(queryToSearch, cached.scryfallQuery);
      onSearch(cached.scryfallQuery, {
        scryfallQuery: cached.scryfallQuery,
        explanation: cached.explanation,
        showAffiliate: cached.showAffiliate
      });
      toast.success('Search (cached)', {
        description: `Found: ${cached.scryfallQuery.substring(0, 50)}${cached.scryfallQuery.length > 50 ? '...' : ''}`
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
      setTimeout(() => reject(new Error('Search timeout')), SEARCH_TIMEOUT_MS);
    });

    try {
      const context = getContext();
      
      const searchPromise = supabase.functions.invoke('semantic-search', {
        body: {
          query: queryToSearch,
          context: context || undefined
        }
      });
      
      const { data, error } = await Promise.race([searchPromise, timeoutPromise]);

      if (error) throw error;

      // Handle rate limiting response
      if (data?.retryAfter) {
        const retryAfterMs = (data.retryAfter || 30) * 1000;
        setRateLimitedUntil(Date.now() + retryAfterMs);
        toast.error('Too many searches', {
          description: `High traffic - retry in ${data.retryAfter}s`,
          icon: <Clock className="h-4 w-4" />
        });
        return;
      }

      if (data?.success && data?.scryfallQuery) {
        saveContext(queryToSearch, data.scryfallQuery);
        
        // Cache the result client-side for 15 minutes
        setCachedResult(queryToSearch, {
          scryfallQuery: data.scryfallQuery,
          explanation: data.explanation,
          showAffiliate: data.showAffiliate
        });
        
        onSearch(data.scryfallQuery, {
          scryfallQuery: data.scryfallQuery,
          explanation: data.explanation,
          showAffiliate: data.showAffiliate
        });
        
        const source = data.source || 'ai';
        toast.success(`Search translated${source !== 'ai' ? ` (${source})` : ''}`, {
          description: `Found: ${data.scryfallQuery.substring(0, 50)}${data.scryfallQuery.length > 50 ? '...' : ''}`
        });
      } else {
        throw new Error(data?.error || 'Failed to translate');
      }
    } catch (error: unknown) {
      // Handle different error types
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage === 'Search timeout') {
        console.error('Search timeout');
        toast.error('Search took too long', {
          description: 'Try a simpler query or try again'
        });
        onSearch(queryToSearch); // Fall back to direct search
      } else if (errorMessage.includes('429') || errorMessage.includes('rate')) {
        setRateLimitedUntil(Date.now() + 30000);
        toast.error('Too many searches', {
          description: 'Please wait a moment before searching again'
        });
      } else {
        console.error('Search error:', error);
        toast.error('Search issue', {
          description: 'Trying direct search instead'
        });
        onSearch(queryToSearch);
      }
    } finally {
      setIsSearching(false);
      abortControllerRef.current = null;
    }
  };

  const showExamples = !query;

  return (
    <search className="space-y-4 sm:space-y-6 w-full max-w-xl mx-auto px-0" role="search" aria-label="Card search">
      {/* Search input - Mobile-first, compact */}
      <div className="relative">
        <div 
          className={`
            relative flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-xl border bg-card
            transition-all duration-200
            ${isFocused 
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
            placeholder={isMobile ? "Search cards..." : "Describe what you're looking for..."}
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
              className="p-1.5 text-muted-foreground hover:text-foreground flex-shrink-0"
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
            disabled={isSearching || isLoading || !query.trim() || rateLimitCountdown > 0}
            variant="accent"
            size="sm"
            className="h-8 sm:h-10 px-3 sm:px-4 rounded-lg gap-1.5 sm:gap-2 font-medium flex-shrink-0"
            aria-label={rateLimitCountdown > 0 ? `Wait ${rateLimitCountdown}s` : isSearching ? 'Searching...' : 'Search for cards'}
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
          
          {/* Feedback button - visible on all sizes */}
          <div className="flex-shrink-0">
            <SearchFeedback 
              originalQuery={query || history[0] || ''} 
              translatedQuery={lastTranslatedQuery} 
            />
          </div>
          
          {/* Help modal - desktop only */}
          <div className="hidden sm:block flex-shrink-0">
            <SearchHelpModal 
              onTryExample={(exampleQuery) => {
                setQuery(exampleQuery);
                handleSearch(exampleQuery);
              }}
            />
          </div>
        </div>
        
        <p id="search-hint" className="sr-only">
          Type your search query and press Enter or click Search
        </p>
      </div>

      {/* Recent searches */}
      {history.length > 0 && showExamples && (
        <div 
          className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 animate-reveal"
          role="group"
          aria-label="Recent searches"
        >
          <span className="inline-flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
            <History className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
            Recent
          </span>
          {history.slice(0, isMobile ? 2 : 4).map((historyQuery, index) => (
            <button
              key={`${historyQuery}-${index}`}
              onClick={() => {
                setQuery(historyQuery);
                handleSearch(historyQuery);
              }}
              className="group inline-flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-border bg-card text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 hover:bg-secondary transition-all duration-200 focus-ring"
              aria-label={`Search for ${historyQuery}`}
            >
              <span className="truncate max-w-[100px] sm:max-w-[180px]">{historyQuery}</span>
              <ArrowRight 
                className="h-3 w-3 opacity-0 -translate-x-0.5 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 flex-shrink-0" 
                aria-hidden="true"
              />
            </button>
          ))}
          <button
            onClick={clearHistory}
            aria-label="Clear search history"
            className="p-1 sm:p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors focus-ring"
          >
            <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Example queries */}
      {showExamples && (
        <div 
          className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 animate-reveal" 
          style={{ animationDelay: '75ms' }}
          role="group"
          aria-label="Example searches"
        >
          <span className="text-xs sm:text-sm text-muted-foreground">Try:</span>
          {EXAMPLE_QUERIES.slice(0, isMobile ? 2 : 4).map((example) => (
            <button
              key={example}
              onClick={() => setQuery(example)}
              className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200 focus-ring"
              aria-label={`Try searching for ${example}`}
            >
              <span className="truncate max-w-[120px] sm:max-w-none inline-block align-middle">
                "{isMobile && example.length > 18 ? `${example.slice(0, 18)}...` : example}"
              </span>
            </button>
          ))}
        </div>
      )}
    </search>
  );
});