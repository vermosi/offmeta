import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Deck, addCardToDeck, createEmptyDeck } from '@/lib/deck';
import { getCardByName } from '@/lib/scryfall';
import { ARCHETYPES, Archetype } from '@/lib/archetypes';
import { 
  fetchScrapedDecks, 
  triggerDeckScrape, 
  ScrapedDeck, 
  DeckSource, 
  DeckFormat, 
  SOURCE_INFO, 
  FORMAT_INFO,
  getBudgetLabel,
  formatPrice 
} from '@/lib/deck-sources';
import { toast } from 'sonner';
import { 
  Sparkles, 
  DollarSign, 
  TrendingDown, 
  Loader2, 
  Search, 
  ChevronDown, 
  RefreshCw,
  ExternalLink,
  Database,
  BookOpen,
  Globe
} from 'lucide-react';

interface ArchetypeExplorerProps {
  onLoadArchetype: (deck: Deck) => void;
}

export function ArchetypeExplorer({ onLoadArchetype }: ArchetypeExplorerProps) {
  const [activeTab, setActiveTab] = useState<'local' | 'online'>('local');
  
  // Local archetype state
  const [searchQuery, setSearchQuery] = useState('');
  const [colorFilter, setColorFilter] = useState<string>('');
  const [budgetFilter, setBudgetFilter] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Online deck state
  const [onlineDecks, setOnlineDecks] = useState<ScrapedDeck[]>([]);
  const [onlineSearch, setOnlineSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<DeckSource>('all');
  const [formatFilter, setFormatFilter] = useState<DeckFormat>('commander');
  const [onlineColorFilter, setOnlineColorFilter] = useState<string>('');
  const [onlineBudgetFilter, setOnlineBudgetFilter] = useState<string>('');
  const [isFetching, setIsFetching] = useState(false);
  const [isScraping, setIsScraping] = useState(false);

  // Fetch online decks when filters change
  useEffect(() => {
    if (activeTab === 'online') {
      fetchDecks();
    }
  }, [activeTab, sourceFilter, formatFilter, onlineColorFilter, onlineBudgetFilter]);

  const fetchDecks = async () => {
    setIsFetching(true);
    try {
      const decks = await fetchScrapedDecks({
        source: sourceFilter,
        format: formatFilter,
        colors: onlineColorFilter ? [onlineColorFilter] : undefined,
        budgetTier: onlineBudgetFilter as 'budget' | 'medium' | 'expensive' | undefined,
        search: onlineSearch || undefined,
      });
      setOnlineDecks(decks);
    } catch (error) {
      console.error('Failed to fetch decks:', error);
      toast.error('Failed to load decks');
    } finally {
      setIsFetching(false);
    }
  };

  const handleScrapeDecks = async () => {
    if (sourceFilter === 'all') {
      toast.error('Please select a specific source to scrape');
      return;
    }

    setIsScraping(true);
    toast.info(`Scraping decks from ${SOURCE_INFO[sourceFilter]?.name || sourceFilter}...`);

    try {
      const result = await triggerDeckScrape(
        sourceFilter,
        formatFilter,
        onlineColorFilter ? [onlineColorFilter] : undefined
      );

      if (result.success) {
        toast.success(`Found ${result.count || 0} decks!`);
        await fetchDecks();
      } else {
        toast.error(result.error || 'Scrape failed');
      }
    } catch (error) {
      console.error('Scrape error:', error);
      toast.error('Failed to scrape decks');
    } finally {
      setIsScraping(false);
    }
  };

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

  const handleLoadScrapedDeck = async (scrapedDeck: ScrapedDeck) => {
    setIsLoading(true);
    setLoadingId(scrapedDeck.id);
    let deck = createEmptyDeck();
    deck.name = scrapedDeck.name;

    // If we have a mainboard, load those cards
    if (scrapedDeck.mainboard.length > 0) {
      let loaded = 0;
      for (const entry of scrapedDeck.mainboard.slice(0, 30)) {
        try {
          const card = await getCardByName(entry.name);
          for (let i = 0; i < entry.quantity; i++) {
            deck = addCardToDeck(deck, card, 'mainboard');
          }
          loaded++;
        } catch (error) {
          console.error(`Failed to load: ${entry.name}`);
        }
        await new Promise(resolve => setTimeout(resolve, 80));
      }
      toast.success(`Loaded ${loaded} unique cards from "${scrapedDeck.name}"`);
    } else if (scrapedDeck.commander_name) {
      // If no mainboard but has commander, try loading commander
      try {
        const card = await getCardByName(scrapedDeck.commander_name);
        deck = addCardToDeck(deck, card, 'mainboard');
        toast.success(`Loaded commander: ${scrapedDeck.commander_name}`);
      } catch (error) {
        toast.error(`Failed to load commander: ${scrapedDeck.commander_name}`);
      }
    } else {
      toast.info('Deck has no card data - visit the source for full list');
    }

    setIsLoading(false);
    setLoadingId(null);
    onLoadArchetype(deck);
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
      {/* Header with tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'local' | 'online')}>
        <div className="flex items-center justify-between gap-2">
          <TabsList className="h-9">
            <TabsTrigger value="local" className="gap-1.5 text-xs">
              <BookOpen className="h-3.5 w-3.5" />
              Curated
            </TabsTrigger>
            <TabsTrigger value="online" className="gap-1.5 text-xs">
              <Globe className="h-3.5 w-3.5" />
              Online
            </TabsTrigger>
          </TabsList>
          
          {activeTab === 'online' && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={handleScrapeDecks}
              disabled={isScraping || sourceFilter === 'all'}
            >
              {isScraping ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Fetch New
            </Button>
          )}
        </div>

        {/* Local Archetypes Tab */}
        <TabsContent value="local" className="space-y-4 mt-4">
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

          <p className="text-sm text-muted-foreground">{filteredArchetypes.length} curated archetypes</p>

          <ScrollArea className="h-[calc(100vh-340px)] min-h-[250px]">
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
                      <button
                        className="w-full p-3 text-left flex items-center gap-3"
                        onClick={() => setExpandedId(isExpanded ? null : archetype.id)}
                      >
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

                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{archetype.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{archetype.description}</div>
                        </div>

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
        </TabsContent>

        {/* Online Decks Tab */}
        <TabsContent value="online" className="space-y-4 mt-4">
          {/* Source & Format filters */}
          <div className="flex gap-2 flex-wrap">
            <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as DeckSource)}>
              <SelectTrigger className="w-32 h-9 bg-secondary/50 border-0">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {Object.entries(SOURCE_INFO).map(([key, info]) => (
                  <SelectItem key={key} value={key}>{info.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={formatFilter} onValueChange={(v) => setFormatFilter(v as DeckFormat)}>
              <SelectTrigger className="w-32 h-9 bg-secondary/50 border-0">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FORMAT_INFO).map(([key, info]) => (
                  <SelectItem key={key} value={key}>{info.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search & Color/Budget filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[140px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search decks..."
                value={onlineSearch}
                onChange={(e) => setOnlineSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchDecks()}
                className="pl-9 h-9 bg-secondary/50 border-0 focus-visible:ring-1"
              />
            </div>
            <Select value={onlineColorFilter || "all"} onValueChange={(v) => setOnlineColorFilter(v === "all" ? "" : v)}>
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
            <Select value={onlineBudgetFilter || "all"} onValueChange={(v) => setOnlineBudgetFilter(v === "all" ? "" : v)}>
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

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {isFetching ? 'Loading...' : `${onlineDecks.length} decks found`}
            </p>
            {sourceFilter !== 'all' && (
              <p className="text-xs text-muted-foreground">
                {SOURCE_INFO[sourceFilter]?.description}
              </p>
            )}
          </div>

          <ScrollArea className="h-[calc(100vh-400px)] min-h-[200px]">
            <div className="space-y-2 pr-4">
              {isFetching ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : onlineDecks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium mb-1">No decks in database</p>
                  <p className="text-xs mb-4">Select a source and click "Fetch New" to scrape decks</p>
                  {sourceFilter !== 'all' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleScrapeDecks}
                      disabled={isScraping}
                      className="gap-1.5"
                    >
                      {isScraping ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Fetch from {SOURCE_INFO[sourceFilter]?.name}
                    </Button>
                  )}
                </div>
              ) : (
                onlineDecks.map((deck, index) => {
                  const isExpanded = expandedId === deck.id;
                  const isLoadingThis = loadingId === deck.id;
                  
                  return (
                    <div
                      key={deck.id}
                      className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 fill-mode-both"
                      style={{ animationDelay: `${index * 20}ms` }}
                    >
                      <div
                        className={`rounded-xl border transition-all duration-200 ${
                          isExpanded
                            ? 'border-border bg-card shadow-sm'
                            : 'border-transparent bg-secondary/30 hover:bg-secondary/50'
                        }`}
                      >
                        <button
                          className="w-full p-3 text-left flex items-center gap-3"
                          onClick={() => setExpandedId(isExpanded ? null : deck.id)}
                        >
                          <div className="flex gap-1 flex-shrink-0">
                            {deck.color_identity.length > 0 ? (
                              deck.color_identity.map(color => (
                                <Badge 
                                  key={color} 
                                  variant={getColorBadgeVariant(color)}
                                  size="sm"
                                  className="w-5 h-5 p-0 justify-center rounded-full font-bold"
                                >
                                  {color}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="secondary" size="sm" className="w-5 h-5 p-0 justify-center rounded-full">
                                C
                              </Badge>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{deck.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {deck.commander_name || deck.archetype || deck.source}
                              {deck.mainboard.length > 0 && ` • ${deck.mainboard.length} cards`}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="outline" size="sm" className="text-xs">
                              {SOURCE_INFO[deck.source]?.name || deck.source}
                            </Badge>
                            <span className="flex text-muted-foreground/60 hidden sm:flex">
                              {getBudgetIcon(deck.budget_tier)}
                            </span>
                            <div className="text-muted-foreground transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                              <ChevronDown className="h-4 w-4" />
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3 animate-in fade-in-0 duration-200">
                            {deck.strategy_notes && (
                              <p className="text-sm text-muted-foreground leading-relaxed">{deck.strategy_notes}</p>
                            )}
                            
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span>{FORMAT_INFO[deck.format as DeckFormat]?.name || deck.format}</span>
                              {deck.estimated_price && (
                                <span>• {formatPrice(deck.estimated_price)}</span>
                              )}
                              {deck.win_rate && (
                                <span>• {deck.win_rate.toFixed(1)}% win rate</span>
                              )}
                            </div>

                            {deck.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {deck.tags.slice(0, 6).map(tag => (
                                  <Badge key={tag} variant="outline" size="sm">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="flex-1 gap-2 h-9"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLoadScrapedDeck(deck);
                                }}
                                disabled={isLoading}
                              >
                                {isLoadingThis ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Sparkles className="h-4 w-4" />
                                )}
                                Load Deck
                              </Button>
                              {deck.source_url && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-9 gap-1.5"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(deck.source_url!, '_blank');
                                  }}
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  View
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
