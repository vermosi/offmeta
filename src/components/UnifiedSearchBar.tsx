import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Loader2, Filter, Search, Wand2, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface UnifiedSearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

const EXAMPLE_QUERIES = [
  { label: "ETB doublers", query: "cards that double ETB effects", semantic: true },
  { label: "Sac outlets", query: "Rakdos sac outlets without mana costs", semantic: true },
  { label: "Ramp spells", query: "cheap green ramp spells", semantic: true },
  { label: "Treasure", query: "creatures that make treasure tokens", semantic: true },
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
  { value: 'W', label: 'W', color: 'bg-amber-100 text-amber-900 border-amber-300' },
  { value: 'U', label: 'U', color: 'bg-blue-500 text-white border-blue-600' },
  { value: 'B', label: 'B', color: 'bg-zinc-800 text-white border-zinc-900' },
  { value: 'R', label: 'R', color: 'bg-red-500 text-white border-red-600' },
  { value: 'G', label: 'G', color: 'bg-green-600 text-white border-green-700' },
];

export function UnifiedSearchBar({ onSearch, isLoading }: UnifiedSearchBarProps) {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState('');
  const [isSemanticMode, setIsSemanticMode] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [format, setFormat] = useState<string>('');
  const [colorIdentity, setColorIdentity] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    if (isSemanticMode) {
      setIsSearching(true);
      try {
        const { data, error } = await supabase.functions.invoke('semantic-search', {
          body: {
            query: query.trim(),
            filters: {
              format: format || undefined,
              colorIdentity: colorIdentity.length > 0 ? colorIdentity : undefined,
            }
          }
        });

        if (error) throw error;

        if (data?.success && data?.scryfallQuery) {
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
        onSearch(query);
      } finally {
        setIsSearching(false);
      }
    } else {
      let fullQuery = query;
      if (colorIdentity.length > 0) {
        fullQuery += ` c:${colorIdentity.join('')}`;
      }
      if (format) {
        fullQuery += ` f:${format}`;
      }
      onSearch(fullQuery.trim());
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

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Main search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          {isSemanticMode ? (
            <Wand2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
          )}
          <Input
            ref={inputRef}
            type="text"
            placeholder={isSemanticMode ? 'Describe what you need...' : 'Scryfall syntax...'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10 sm:pl-11 pr-20 sm:pr-24 h-11 sm:h-12 text-sm sm:text-base bg-card border-border focus:border-primary"
          />
          
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-12 sm:right-16 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8"
              onClick={() => setQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8"
              >
                <Filter className="h-4 w-4" />
                {activeFiltersCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] justify-center"
                  >
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 bg-popover" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Format</label>
                  <Select value={format || "all"} onValueChange={(v) => setFormat(v === "all" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any format" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="all">Any format</SelectItem>
                      {FORMATS.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Colors</label>
                  <div className="flex gap-1.5">
                    {COLORS.map(c => (
                      <Button
                        key={c.value}
                        variant="outline"
                        size="sm"
                        onClick={() => toggleColor(c.value)}
                        className={`w-9 h-9 p-0 font-bold ${colorIdentity.includes(c.value) ? c.color : ''}`}
                      >
                        {c.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" className="w-full" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <Button
          onClick={handleSearch}
          disabled={isSearching || isLoading || !query.trim()}
          className="h-11 sm:h-12 px-3 sm:px-5 gap-1.5"
        >
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isSemanticMode ? (
            <Sparkles className="h-4 w-4" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Search</span>
        </Button>
      </div>

      {/* Mode toggle + quick examples */}
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-1">
          <Button
            variant={isSemanticMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsSemanticMode(true)}
            className="h-8 text-xs gap-1 px-2 sm:px-3"
          >
            <Wand2 className="h-3 w-3" />
            AI
          </Button>
          <Button
            variant={!isSemanticMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsSemanticMode(false)}
            className="h-8 text-xs gap-1 px-2 sm:px-3"
          >
            <Search className="h-3 w-3" />
            Syntax
          </Button>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto flex-1 scrollbar-hide">
          {EXAMPLE_QUERIES.slice(0, isMobile ? 2 : 4).map((example) => (
            <Button
              key={example.query}
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery(example.query);
                setIsSemanticMode(example.semantic);
              }}
              className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground whitespace-nowrap flex-shrink-0"
            >
              {example.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
