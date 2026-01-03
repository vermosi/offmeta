import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Loader2, X, Wand2, History } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { OnboardingTooltip } from '@/components/OnboardingTooltip';

const SEARCH_CONTEXT_KEY = 'lastSearchContext';
const SEARCH_HISTORY_KEY = 'offmeta_search_history';
const MAX_HISTORY_ITEMS = 5;

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
}

const EXAMPLE_QUERIES = [
  "creatures that make treasure tokens",
  "cheap green ramp spells",
  "cards that double ETB effects",
  "Rakdos sacrifice outlets",
];

export function UnifiedSearchBar({ onSearch, isLoading }: UnifiedSearchBarProps) {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { saveContext, getContext } = useSearchContext();
  const { history, addToHistory, clearHistory } = useSearchHistory();

  const handleSearch = async (searchQuery?: string) => {
    const queryToSearch = searchQuery || query;
    if (!queryToSearch.trim()) return;

    setIsSearching(true);
    addToHistory(queryToSearch.trim());

    try {
      const context = getContext();
      const { data, error } = await supabase.functions.invoke('semantic-search', {
        body: {
          query: queryToSearch.trim(),
          context: context || undefined
        }
      });

      if (error) throw error;

      if (data?.success && data?.scryfallQuery) {
        // Save context for follow-up searches
        saveContext(queryToSearch.trim(), data.scryfallQuery);
        
        onSearch(data.scryfallQuery, {
          scryfallQuery: data.scryfallQuery,
          explanation: data.explanation,
          showAffiliate: data.showAffiliate
        });
        
        toast.success('Search translated', {
          description: `Found: ${data.scryfallQuery.substring(0, 50)}${data.scryfallQuery.length > 50 ? '...' : ''}`
        });
      } else {
        throw new Error(data?.error || 'Failed to translate');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search issue', {
        description: 'Trying direct search instead'
      });
      onSearch(queryToSearch);
    } finally {
      setIsSearching(false);
    }
  };

  const showExamples = !query;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Instructions */}
      <div className="text-center space-y-1">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground">
          Find Magic Cards with Natural Language
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
          Describe what you're looking for in plain English — no complex syntax needed
        </p>
      </div>

      {/* Onboarding tooltip for first-time visitors */}
      <OnboardingTooltip />

      {/* Main search bar */}
      <div className="flex items-center gap-2 sm:gap-3 max-w-2xl mx-auto">
        <div className="relative flex-1">
          <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2">
            <Wand2 className="h-4 w-4 text-primary" />
          </div>
          <Input
            ref={inputRef}
            type="text"
            placeholder="e.g. creatures that make treasure tokens..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9 sm:pl-11 pr-12 h-12 sm:h-14 text-sm sm:text-base bg-muted/30 border-border/50 focus:border-primary/50 focus:bg-background transition-all rounded-xl"
          />
          
          {query && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-muted/80 hover:bg-muted text-foreground min-h-0 min-w-0 rounded-full"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Button
          onClick={() => handleSearch()}
          disabled={isSearching || isLoading || !query.trim()}
          className="h-12 sm:h-14 px-3 sm:px-6 gap-2 rounded-xl min-w-0"
        >
          {isSearching ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Search className="h-5 w-5" />
          )}
          <span className="hidden sm:inline">Search</span>
        </Button>
      </div>

      {/* Recent searches */}
      {history.length > 0 && showExamples && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 animate-fade-in px-2">
          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
            <History className="h-3 w-3" />
            <span>Recent:</span>
          </div>
          {history.slice(0, isMobile ? 2 : 4).map((historyQuery, index) => (
            <Button
              key={`${historyQuery}-${index}`}
              variant="outline"
              size="sm"
              onClick={() => {
                setQuery(historyQuery);
                handleSearch(historyQuery);
              }}
              className="h-7 text-[10px] sm:text-xs px-2 sm:px-3 border-primary/20 text-foreground hover:bg-primary/10 hover:border-primary/40 rounded-full min-h-0 min-w-0 inline-touch"
            >
              {historyQuery.length > (isMobile ? 18 : 28) ? `${historyQuery.slice(0, isMobile ? 18 : 28)}...` : historyQuery}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            aria-label="Clear history"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive rounded-full min-h-0 min-w-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Example queries */}
      {showExamples && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 animate-fade-in px-2">
          <span className="text-[10px] sm:text-xs text-muted-foreground">Try:</span>
          {EXAMPLE_QUERIES.slice(0, isMobile ? 2 : 4).map((example) => (
            <Button
              key={example}
              variant="ghost"
              size="sm"
              onClick={() => setQuery(example)}
              className="h-7 text-[10px] sm:text-xs px-2 sm:px-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full min-h-0 min-w-0 inline-touch"
            >
              "{isMobile && example.length > 20 ? `${example.slice(0, 20)}...` : example}"
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
