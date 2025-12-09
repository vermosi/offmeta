import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Deck, addCardToDeck, createEmptyDeck } from '@/lib/deck';
import { getCardByName } from '@/lib/scryfall';
import { ARCHETYPES, Archetype } from '@/lib/archetypes';
import { toast } from 'sonner';
import { Sparkles, DollarSign, TrendingDown, Loader2, Search, ChevronDown, ChevronUp } from 'lucide-react';

interface ArchetypeExplorerProps {
  onLoadArchetype: (deck: Deck) => void;
}

export function ArchetypeExplorer({ onLoadArchetype }: ArchetypeExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [colorFilter, setColorFilter] = useState<string>('');
  const [budgetFilter, setBudgetFilter] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filteredArchetypes = ARCHETYPES.filter(archetype => {
    const matchesSearch = archetype.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      archetype.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      archetype.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesColor = !colorFilter || archetype.colorIdentity.includes(colorFilter);
    const matchesBudget = !budgetFilter || archetype.budgetTier === budgetFilter;

    return matchesSearch && matchesColor && matchesBudget;
  });

  const handleLoadArchetype = async (archetype: Archetype) => {
    setIsLoading(true);
    setLoadingId(archetype.id);
    let deck = createEmptyDeck();
    deck.name = archetype.name;

    const allCards = [...archetype.coreCards, ...archetype.flexCards.slice(0, 8)];
    let loaded = 0;

    for (const cardName of allCards) {
      try {
        const card = await getCardByName(cardName);
        deck = addCardToDeck(deck, card, 'mainboard');
        loaded++;
      } catch (error) {
        console.error(`Failed to load: ${cardName}`);
      }
      await new Promise(resolve => setTimeout(resolve, 80));
    }

    setIsLoading(false);
    setLoadingId(null);
    onLoadArchetype(deck);
    toast.success(`Loaded ${loaded} cards from "${archetype.name}"`);
  };

  const getBudgetIcon = (tier: string) => {
    const count = tier === 'budget' ? 1 : tier === 'medium' ? 2 : 3;
    return Array(count).fill(null).map((_, i) => (
      <DollarSign key={i} className="h-3 w-3" />
    ));
  };

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      'W': 'bg-amber-100 text-amber-900',
      'U': 'bg-blue-500 text-white',
      'B': 'bg-zinc-800 text-white',
      'R': 'bg-red-500 text-white',
      'G': 'bg-green-600 text-white',
    };
    return colorMap[color] || 'bg-muted';
  };

  return (
    <div className="space-y-4">
      {/* Compact header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-semibold">Brew Recipes</h2>
          <p className="text-sm text-muted-foreground">{filteredArchetypes.length} off-meta archetypes</p>
        </div>
      </div>

      {/* Filters - more compact */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Select value={colorFilter || "all"} onValueChange={(v) => setColorFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-28 h-9">
            <SelectValue placeholder="Color" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All colors</SelectItem>
            <SelectItem value="W">White</SelectItem>
            <SelectItem value="U">Blue</SelectItem>
            <SelectItem value="B">Black</SelectItem>
            <SelectItem value="R">Red</SelectItem>
            <SelectItem value="G">Green</SelectItem>
          </SelectContent>
        </Select>
        <Select value={budgetFilter || "all"} onValueChange={(v) => setBudgetFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-28 h-9">
            <SelectValue placeholder="Budget" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All budgets</SelectItem>
            <SelectItem value="budget">Budget</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="expensive">Expensive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Archetype list - cleaner cards */}
      <ScrollArea className="h-[calc(100vh-320px)] min-h-[400px]">
        <div className="space-y-2 pr-4">
          {filteredArchetypes.map((archetype) => {
            const isExpanded = expandedId === archetype.id;
            const isLoadingThis = loadingId === archetype.id;
            
            return (
              <div
                key={archetype.id}
                className={`rounded-lg border transition-all ${
                  isExpanded
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                {/* Main row - always visible */}
                <button
                  className="w-full p-3 text-left flex items-center gap-3"
                  onClick={() => setExpandedId(isExpanded ? null : archetype.id)}
                >
                  {/* Color pips */}
                  <div className="flex gap-0.5 flex-shrink-0">
                    {archetype.colorIdentity.map(color => (
                      <span 
                        key={color} 
                        className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${getColorClass(color)}`}
                      >
                        {color}
                      </span>
                    ))}
                  </div>

                  {/* Name & description */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{archetype.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{archetype.description}</div>
                  </div>

                  {/* Meta info */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-primary flex items-center gap-0.5">
                      <TrendingDown className="h-3 w-3" />
                      {archetype.offMetaScore}%
                    </span>
                    <span className="flex text-muted-foreground">
                      {getBudgetIcon(archetype.budgetTier)}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                    <p className="text-sm text-muted-foreground">{archetype.gameplan}</p>
                    
                    <div className="flex flex-wrap gap-1">
                      {archetype.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div>
                      <div className="text-xs font-medium mb-1.5 text-muted-foreground">Core Cards</div>
                      <div className="flex flex-wrap gap-1">
                        {archetype.coreCards.map(card => (
                          <Badge key={card} variant="secondary" className="text-xs">
                            {card}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      className="w-full gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadArchetype(archetype);
                      }}
                      disabled={isLoading}
                    >
                      {isLoadingThis ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Load Archetype
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {filteredArchetypes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No archetypes match your filters
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
