import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Loader2, Filter, Wand2, Lightbulb } from 'lucide-react';

interface SemanticSearchProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

const EXAMPLE_QUERIES = [
  "cards that double ETB effects",
  "Rakdos sac outlets without mana costs",
  "cheap green ramp spells",
  "creatures that make treasure tokens",
  "graveyard recursion in black",
  "lands that tap for any color",
  "blue counterspells that draw cards",
  "artifacts that reduce spell costs",
];

const FORMATS = [
  { value: 'commander', label: 'Commander' },
  { value: 'modern', label: 'Modern' },
  { value: 'standard', label: 'Standard' },
  { value: 'pioneer', label: 'Pioneer' },
  { value: 'legacy', label: 'Legacy' },
  { value: 'vintage', label: 'Vintage' },
  { value: 'pauper', label: 'Pauper' },
];

const COLORS = [
  { value: 'W', label: 'White', color: 'bg-amber-100 text-amber-900' },
  { value: 'U', label: 'Blue', color: 'bg-blue-500 text-white' },
  { value: 'B', label: 'Black', color: 'bg-zinc-800 text-white' },
  { value: 'R', label: 'Red', color: 'bg-red-500 text-white' },
  { value: 'G', label: 'Green', color: 'bg-green-600 text-white' },
];

export function SemanticSearch({ onSearch, isLoading }: SemanticSearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [format, setFormat] = useState<string>('');
  const [colorIdentity, setColorIdentity] = useState<string[]>([]);
  const [maxCmc, setMaxCmc] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [lastTranslation, setLastTranslation] = useState<{ original: string; translated: string } | null>(null);

  const handleSemanticSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('semantic-search', {
        body: {
          query: query.trim(),
          filters: {
            format: format || undefined,
            colorIdentity: colorIdentity.length > 0 ? colorIdentity : undefined,
            maxCmc: maxCmc ? parseInt(maxCmc) : undefined,
          }
        }
      });

      if (error) throw error;

      if (data?.success && data?.scryfallQuery) {
        setLastTranslation({
          original: query,
          translated: data.scryfallQuery
        });
        onSearch(data.scryfallQuery);
        toast.success('Semantic search translated!', {
          description: `"${query}" → "${data.scryfallQuery}"`
        });
      } else {
        throw new Error(data?.error || 'Failed to translate search');
      }
    } catch (error) {
      console.error('Semantic search error:', error);
      toast.error('Semantic search failed', {
        description: 'Falling back to regular search'
      });
      // Fallback to regular search
      onSearch(query);
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

  const handleExampleClick = (example: string) => {
    setQuery(example);
  };

  return (
    <div className="space-y-4">
      {/* Main search bar */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Wand2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
            <Input
              type="text"
              placeholder='Try: "cards that double ETB effects" or "Rakdos sac outlets"'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSemanticSearch()}
              className="pl-11 pr-4 h-14 text-lg bg-card border-2 border-primary/30 focus:border-primary"
            />
          </div>
          <Button
            onClick={handleSemanticSearch}
            disabled={isSearching || isLoading || !query.trim()}
            className="h-14 px-6 gap-2"
            size="lg"
          >
            {isSearching ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
            <span className="hidden sm:inline">Semantic Search</span>
          </Button>
        </div>

        {/* Filters toggle */}
        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-32 sm:right-48 top-1/2 -translate-y-1/2 gap-1 text-muted-foreground hover:text-foreground"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              {(format || colorIdentity.length > 0 || maxCmc) && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                  {(format ? 1 : 0) + (colorIdentity.length > 0 ? 1 : 0) + (maxCmc ? 1 : 0)}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Format</label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any format</SelectItem>
                    {FORMATS.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Color Identity</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <Button
                      key={c.value}
                      variant={colorIdentity.includes(c.value) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleColor(c.value)}
                      className={colorIdentity.includes(c.value) ? c.color : ''}
                    >
                      {c.value}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Max Mana Value</label>
                <Input
                  type="number"
                  min="0"
                  max="16"
                  placeholder="Any"
                  value={maxCmc}
                  onChange={(e) => setMaxCmc(e.target.value)}
                />
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  setFormat('');
                  setColorIdentity([]);
                  setMaxCmc('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Last translation display */}
      {lastTranslation && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="truncate">
            "{lastTranslation.original}" → <code className="text-primary">{lastTranslation.translated}</code>
          </span>
        </div>
      )}

      {/* Example queries */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lightbulb className="h-4 w-4" />
          <span>Try these examples:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUERIES.slice(0, 4).map((example) => (
            <Button
              key={example}
              variant="outline"
              size="sm"
              onClick={() => handleExampleClick(example)}
              className="text-xs"
            >
              {example}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
