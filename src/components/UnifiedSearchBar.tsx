import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Loader2, SlidersHorizontal, X, Wand2, History, Mic } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { VoiceSearchButton } from '@/components/VoiceSearchButton';
import { cn } from '@/lib/utils';

const VOICE_HISTORY_KEY = 'recentVoiceSearches';
const MAX_HISTORY_ITEMS = 5;

function useVoiceSearchHistory() {
  const [history, setHistory] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(VOICE_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const addSearch = useCallback((query: string) => {
    if (!query.trim()) return;
    setHistory(prev => {
      const filtered = prev.filter(q => q.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem(VOICE_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(VOICE_HISTORY_KEY);
  }, []);

  return { history, addSearch, clearHistory };
}

interface UnifiedSearchBarProps {
  onSearch: (query: string) => void;
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
  const [translatedQuery, setTranslatedQuery] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { history: voiceHistory, addSearch: addVoiceSearch, clearHistory: clearVoiceHistory } = useVoiceSearchHistory();

  // Voice input hook
  const {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening
  } = useVoiceInput({
    onTranscript: (text) => {
      setQuery(text);
    },
    onFinalTranscript: (text) => {
      setQuery(text);
      // Auto-search when speech ends and save to voice history
      if (text.trim()) {
        addVoiceSearch(text.trim());
        setTimeout(() => handleSearch(text), 300);
      }
    }
  });

  // Update query when transcript changes during listening
  useEffect(() => {
    if (isListening && transcript) {
      setQuery(transcript);
    }
  }, [isListening, transcript]);

  const handleSearch = async (searchQuery?: string) => {
    const queryToSearch = searchQuery || query;
    if (!queryToSearch.trim()) return;

    setIsSearching(true);
    setTranslatedQuery(null);

    try {
      const { data, error } = await supabase.functions.invoke('semantic-search', {
        body: {
          query: queryToSearch.trim(),
          filters: {
            format: format || undefined,
            colorIdentity: colorIdentity.length > 0 ? colorIdentity : undefined,
          }
        }
      });

      if (error) throw error;

      if (data?.success && data?.scryfallQuery) {
        setTranslatedQuery(data.scryfallQuery);
        onSearch(data.scryfallQuery);
        toast.success('Search translated', {
          description: data.scryfallQuery
        });
      } else {
        throw new Error(data?.error || 'Failed to translate');
      }
    } catch (error) {
      console.error('Semantic search error:', error);
      toast.error('Using fallback search');
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

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      setQuery('');
      setTranslatedQuery(null);
      startListening();
    }
  };

  const activeFiltersCount = (format ? 1 : 0) + (colorIdentity.length > 0 ? 1 : 0);
  const showExamples = !query && !isListening;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Hero search area */}
      <div className="text-center space-y-1.5 sm:space-y-2">
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          Find the perfect cards
        </h2>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Describe what you need in plain English, or tap the mic to speak
        </p>
      </div>

      {/* Main search bar with voice button */}
      <div className="flex items-center gap-2 sm:gap-3 max-w-2xl mx-auto">
        <VoiceSearchButton
          isListening={isListening}
          isSupported={isSupported}
          isProcessing={isSearching}
          onToggle={handleVoiceToggle}
        />

        <div className="relative flex-1">
          <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2">
            <Wand2 className="h-4 w-4 text-primary" />
          </div>
          <Input
            ref={inputRef}
            type="text"
            placeholder={isListening ? 'Listening...' : 'Describe what you need...'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className={cn(
              "pl-9 sm:pl-11 pr-10 sm:pr-12 h-12 sm:h-14 text-sm sm:text-base bg-muted/30 border-border/50 focus:border-primary/50 focus:bg-background transition-all rounded-xl",
              isListening && "border-destructive/50 bg-destructive/5 animate-pulse-subtle"
            )}
            disabled={isListening}
          />
          
          {query && !isListening && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-10 sm:right-12 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground min-h-0 min-w-0"
              onClick={() => {
                setQuery('');
                setTranslatedQuery(null);
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
          disabled={isSearching || isLoading || !query.trim() || isListening}
          className="h-12 sm:h-14 px-3 sm:px-6 gap-2 rounded-xl min-w-0"
        >
          {isSearching ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
          <span className="hidden sm:inline">Search</span>
        </Button>
      </div>

      {/* Listening indicator */}
      {isListening && (
        <div className="text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-destructive/10 text-destructive rounded-full text-xs sm:text-sm font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
            </span>
            Listening... speak now
          </div>
        </div>
      )}

      {/* Translated query display */}
      {translatedQuery && !isListening && (
        <div className="text-center animate-fade-in px-2">
          <p className="text-xs text-muted-foreground">
            Translated to: <code className="px-1.5 py-0.5 bg-muted rounded text-foreground text-[11px] break-all">{translatedQuery}</code>
          </p>
        </div>
      )}

      {/* Recent voice searches */}
      {voiceHistory.length > 0 && showExamples && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 animate-fade-in px-2">
          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
            <Mic className="h-3 w-3" />
            <span>Recent:</span>
          </div>
          {voiceHistory.slice(0, isMobile ? 2 : 4).map((voiceQuery, index) => (
            <Button
              key={`${voiceQuery}-${index}`}
              variant="outline"
              size="sm"
              onClick={() => {
                setQuery(voiceQuery);
                handleSearch(voiceQuery);
              }}
              className="h-7 text-[10px] sm:text-xs px-2 sm:px-3 border-primary/20 text-foreground hover:bg-primary/10 hover:border-primary/40 rounded-full gap-1 sm:gap-1.5 min-h-0 min-w-0 inline-touch"
            >
              <History className="h-3 w-3" />
              {voiceQuery.length > (isMobile ? 15 : 25) ? `${voiceQuery.slice(0, isMobile ? 15 : 25)}...` : voiceQuery}
            </Button>
          ))}
          {voiceHistory.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearVoiceHistory}
              className="h-7 text-xs px-2 text-muted-foreground hover:text-destructive rounded-full min-h-0 min-w-0 inline-touch"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
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
