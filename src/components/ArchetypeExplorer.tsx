import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Deck, addCardToDeck, createEmptyDeck } from '@/lib/deck';
import { getCardByName } from '@/lib/scryfall';
import { ARCHETYPES, Archetype } from '@/lib/archetypes';
import { toast } from 'sonner';
import { Sparkles, Star, DollarSign, TrendingDown, BookOpen, Loader2, Search, Beaker } from 'lucide-react';

interface ArchetypeExplorerProps {
  onLoadArchetype: (deck: Deck) => void;
}

export function ArchetypeExplorer({ onLoadArchetype }: ArchetypeExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [colorFilter, setColorFilter] = useState<string>('');
  const [budgetFilter, setBudgetFilter] = useState<string>('');
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    let deck = createEmptyDeck();
    deck.name = archetype.name;

    const allCards = [...archetype.coreCards, ...archetype.flexCards.slice(0, 10)];
    let loaded = 0;
    let failed = 0;

    for (const cardName of allCards) {
      try {
        const card = await getCardByName(cardName);
        deck = addCardToDeck(deck, card, 'mainboard');
        loaded++;
      } catch (error) {
        console.error(`Failed to load: ${cardName}`);
        failed++;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsLoading(false);
    onLoadArchetype(deck);
    toast.success(`Loaded ${loaded} cards from "${archetype.name}"`, {
      description: failed > 0 ? `${failed} cards could not be found` : undefined
    });
  };

  const getBudgetIcon = (tier: string) => {
    switch (tier) {
      case 'budget': return <DollarSign className="h-3 w-3" />;
      case 'medium': return <><DollarSign className="h-3 w-3" /><DollarSign className="h-3 w-3" /></>;
      case 'expensive': return <><DollarSign className="h-3 w-3" /><DollarSign className="h-3 w-3" /><DollarSign className="h-3 w-3" /></>;
      default: return null;
    }
  };

  const getColorBadge = (color: string) => {
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
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Beaker className="h-5 w-5 text-primary" />
          Brew Recipes ({ARCHETYPES.length})
        </CardTitle>
        <CardDescription>
          Off-meta archetypes to inspire your next deck
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search archetypes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Select value={colorFilter} onValueChange={setColorFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Color" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any color</SelectItem>
              <SelectItem value="W">White</SelectItem>
              <SelectItem value="U">Blue</SelectItem>
              <SelectItem value="B">Black</SelectItem>
              <SelectItem value="R">Red</SelectItem>
              <SelectItem value="G">Green</SelectItem>
            </SelectContent>
          </Select>
          <Select value={budgetFilter} onValueChange={setBudgetFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Budget" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any budget</SelectItem>
              <SelectItem value="budget">Budget</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="expensive">Expensive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Archetype list */}
        <ScrollArea className="h-[500px]">
          <div className="space-y-3">
            {filteredArchetypes.map((archetype) => (
              <div
                key={archetype.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedArchetype?.id === archetype.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedArchetype(
                  selectedArchetype?.id === archetype.id ? null : archetype
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-display font-semibold">{archetype.name}</h3>
                    <p className="text-sm text-muted-foreground">{archetype.description}</p>
                  </div>
                  <div className="flex gap-1">
                    {archetype.colorIdentity.map(color => (
                      <Badge key={color} className={`${getColorBadge(color)} px-1.5`}>
                        {color}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1 text-primary">
                    <TrendingDown className="h-4 w-4" />
                    <span>{archetype.offMetaScore}% off-meta</span>
                  </div>
                  <div className="flex items-center gap-0.5 text-muted-foreground">
                    {getBudgetIcon(archetype.budgetTier)}
                  </div>
                  <div className="flex gap-1">
                    {archetype.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Expanded view */}
                {selectedArchetype?.id === archetype.id && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3">
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-1 mb-1">
                        <BookOpen className="h-4 w-4" />
                        Gameplan
                      </h4>
                      <p className="text-sm text-muted-foreground">{archetype.gameplan}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-1 mb-1">
                        <Star className="h-4 w-4 text-primary" />
                        Core Cards ({archetype.coreCards.length})
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {archetype.coreCards.map(card => (
                          <Badge key={card} variant="secondary" className="text-xs">
                            {card}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-1">
                        Flex Options ({archetype.flexCards.length})
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {archetype.flexCards.map(card => (
                          <Badge key={card} variant="outline" className="text-xs">
                            {card}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Button
                      className="w-full gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadArchetype(archetype);
                      }}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Start Deck from Archetype
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
