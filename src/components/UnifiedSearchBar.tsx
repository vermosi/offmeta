import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Loader2, SlidersHorizontal, X, Wand2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { OnboardingTooltip } from '@/components/OnboardingTooltip';

const SEARCH_CONTEXT_KEY = 'lastSearchContext';

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

const FORMATS = [
  { value: 'commander', label: 'Commander' },
  { value: 'modern', label: 'Modern' },
  { value: 'standard', label: 'Standard' },
  { value: 'pioneer', label: 'Pioneer' },
  { value: 'legacy', label: 'Legacy' },
  { value: 'pauper', label: 'Pauper' },
  { value: 'vintage', label: 'Vintage' },
  { value: 'historic', label: 'Historic' },
  { value: 'duel', label: 'Duel Commander' },
  { value: 'paupercommander', label: 'Pauper Commander' },
  { value: 'oldschool', label: 'Old School' },
  { value: 'premodern', label: 'Premodern' },
  { value: 'oathbreaker', label: 'Oathbreaker' },
];

const COLORS = [
  { value: 'W', label: 'W', color: 'bg-amber-50 text-amber-900 border-amber-200' },
  { value: 'U', label: 'U', color: 'bg-blue-500 text-white border-blue-600' },
  { value: 'B', label: 'B', color: 'bg-zinc-800 text-white border-zinc-900' },
  { value: 'R', label: 'R', color: 'bg-red-500 text-white border-red-600' },
  { value: 'G', label: 'G', color: 'bg-emerald-500 text-white border-emerald-600' },
];

export function UnifiedSearchBar({ onSearch, isLoading }: UnifiedSearchBarProps) {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [format, setFormat] = useState<string>('');
  const [colorIdentity, setColorIdentity] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { saveContext, getContext } = useSearchContext();

  const handleSearch = async (searchQuery?: string) => {
    const queryToSearch = searchQuery || query;
    if (!queryToSearch.trim()) return;

    setIsSearching(true);

    try {
      const context = getContext();
      const { data, error } = await supabase.functions.invoke('semantic-search', {
        body: {
          query: queryToSearch.trim(),
          filters: {
            format: format || undefined,
            colorIdentity: colorIdentity.length > 0 ? colorIdentity : undefined,
          },
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

  const toggleColor = (color: string) => {
    setColorIdentity(prev =>
      prev.includes(color)
        ? prev.filter(c => c !== color)
        : [...prev, color]
    );
  };

  const clearFilters = () => {
    setFormat('');
    setColorIdentity([]);
  };

  const activeFiltersCount = (format ? 1 : 0) + (colorIdentity.length > 0 ? 1 : 0);
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
            className="pl-9 sm:pl-11 pr-10 sm:pr-12 h-12 sm:h-14 text-sm sm:text-base bg-muted/30 border-border/50 focus:border-primary/50 focus:bg-background transition-all rounded-xl"
          />
          
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-10 sm:right-12 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground min-h-0 min-w-0"
              onClick={() => {
                setQuery('');
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Search filters"
                className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground min-h-0 min-w-0"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-primary text-primary-foreground rounded-full text-[10px] font-medium flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Format</label>
                  <Select value={format || "all"} onValueChange={(v) => setFormat(v === "all" ? "" : v)}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Any format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any format</SelectItem>
                      {FORMATS.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Colors</label>
                  <div className="flex gap-1.5">
                    {COLORS.map(c => (
                      <Button
                        key={c.value}
                        variant="outline"
                        size="sm"
                        onClick={() => toggleColor(c.value)}
                        className={`w-10 h-10 p-0 font-semibold text-xs min-h-0 min-w-0 ${colorIdentity.includes(c.value) ? c.color : 'text-muted-foreground'}`}
                      >
                        {c.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" className="w-full text-muted-foreground h-10" onClick={clearFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
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
