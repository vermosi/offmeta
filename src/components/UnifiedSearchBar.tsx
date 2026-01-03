import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Loader2, SlidersHorizontal, X, Wand2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { VoiceSearchButton } from '@/components/VoiceSearchButton';
import { cn } from '@/lib/utils';

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
      // Auto-search when speech ends
      if (text.trim()) {
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
    <div className="space-y-6">
      {/* Hero search area */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Find the perfect cards
        </h2>
        <p className="text-muted-foreground text-sm">
          Describe what you need in plain English, or tap the mic to speak
        </p>
      </div>

      {/* Main search bar with voice button */}
      <div className="flex items-center gap-3 max-w-2xl mx-auto">
        <VoiceSearchButton
          isListening={isListening}
          isSupported={isSupported}
          isProcessing={isSearching}
          onToggle={handleVoiceToggle}
        />

        <div className="relative flex-1">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
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
              "pl-11 pr-12 h-14 text-base bg-muted/30 border-border/50 focus:border-primary/50 focus:bg-background transition-all rounded-xl",
              isListening && "border-destructive/50 bg-destructive/5 animate-pulse-subtle"
            )}
            disabled={isListening}
          />
          
          {query && !isListening && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-12 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
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
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 text-muted-foreground hover:text-foreground"
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
                    <SelectTrigger className="h-9">
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
                        className={`w-8 h-8 p-0 font-semibold text-xs ${colorIdentity.includes(c.value) ? c.color : 'text-muted-foreground'}`}
                      >
                        {c.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={clearFilters}>
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
          className="h-14 px-6 gap-2 rounded-xl"
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
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-full text-sm font-medium">
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
        <div className="text-center animate-fade-in">
          <p className="text-xs text-muted-foreground">
            Translated to: <code className="px-1.5 py-0.5 bg-muted rounded text-foreground">{translatedQuery}</code>
          </p>
        </div>
      )}

      {/* Example queries */}
      {showExamples && (
        <div className="flex flex-wrap items-center justify-center gap-2 animate-fade-in">
          <span className="text-xs text-muted-foreground">Try:</span>
          {EXAMPLE_QUERIES.slice(0, isMobile ? 2 : 4).map((example) => (
            <Button
              key={example}
              variant="ghost"
              size="sm"
              onClick={() => setQuery(example)}
              className="h-7 text-xs px-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full"
            >
              "{example}"
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
