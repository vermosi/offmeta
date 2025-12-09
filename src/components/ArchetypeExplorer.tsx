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

  const getColorBadgeVariant = (color: string): "white" | "blue" | "black" | "red" | "green" | "secondary" => {
    const colorMap: Record<string, "white" | "blue" | "black" | "red" | "green"> = {
      'W': 'white',
      'U': 'blue',
      'B': 'black',
      'R': 'red',
      'G': 'green',
    };
    return colorMap[color] || 'secondary';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Brew Recipes</h2>
          <p className="text-sm text-muted-foreground">{filteredArchetypes.length} archetypes</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search archetypes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-secondary/50 border-0 focus-visible:ring-1"
          />
        </div>
        <Select value={colorFilter || "all"} onValueChange={(v) => setColorFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-24 h-9 bg-secondary/50 border-0">
            <SelectValue placeholder="Color" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Colors</SelectItem>
            <SelectItem value="W">White</SelectItem>
            <SelectItem value="U">Blue</SelectItem>
            <SelectItem value="B">Black</SelectItem>
            <SelectItem value="R">Red</SelectItem>
            <SelectItem value="G">Green</SelectItem>
          </SelectContent>
        </Select>
        <Select value={budgetFilter || "all"} onValueChange={(v) => setBudgetFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-28 h-9 bg-secondary/50 border-0">
            <SelectValue placeholder="Budget" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Budgets</SelectItem>
            <SelectItem value="budget">Budget</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="expensive">Expensive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Archetype list */}
      <ScrollArea className="h-[calc(100vh-280px)] min-h-[300px]">
        <div className="space-y-2 pr-4">
          {filteredArchetypes.map((archetype, index) => {
            const isExpanded = expandedId === archetype.id;
            const isLoadingThis = loadingId === archetype.id;
            
            return (
              <div
                key={archetype.id}
                className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 fill-mode-both"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div
                  className={`rounded-xl border transition-all duration-200 ${
                    isExpanded
                      ? 'border-border bg-card shadow-sm'
                      : 'border-transparent bg-secondary/30 hover:bg-secondary/50'
                  }`}
                >
                  {/* Main row */}
                  <button
                    className="w-full p-3 text-left flex items-center gap-3"
                    onClick={() => setExpandedId(isExpanded ? null : archetype.id)}
                  >
                    {/* Color pips */}
                    <div className="flex gap-1 flex-shrink-0">
                      {archetype.colorIdentity.map(color => (
                        <Badge 
                          key={color} 
                          variant={getColorBadgeVariant(color)}
                          size="sm"
                          className="w-5 h-5 p-0 justify-center rounded-full font-bold"
                        >
                          {color}
                        </Badge>
                      ))}
                    </div>

                    {/* Name & description */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{archetype.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{archetype.description}</div>
                    </div>

                    {/* Meta info */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="info" size="sm" className="gap-0.5">
                        <TrendingDown className="h-3 w-3" />
                        {archetype.offMetaScore}%
                      </Badge>
                      <span className="flex text-muted-foreground/60 hidden sm:flex">
                        {getBudgetIcon(archetype.budgetTier)}
                      </span>
                      <div className="text-muted-foreground transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3 animate-in fade-in-0 duration-200">
                      <p className="text-sm text-muted-foreground leading-relaxed">{archetype.gameplan}</p>
                      
                      <div className="flex flex-wrap gap-1.5">
                        {archetype.tags.map(tag => (
                          <Badge key={tag} variant="outline" size="sm">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div>
                        <div className="text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wide">Core Cards</div>
                        <div className="flex flex-wrap gap-1.5">
                          {archetype.coreCards.map(card => (
                            <Badge key={card} variant="secondary" size="sm">
                              {card}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        className="w-full gap-2 h-9"
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
              </div>
            );
          })}

          {filteredArchetypes.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No archetypes match your filters</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}