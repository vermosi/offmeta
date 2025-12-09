import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { UnifiedSearchBar } from "@/components/UnifiedSearchBar";
import { CardItemWithDeck } from "@/components/CardItemWithDeck";
import { CardModal } from "@/components/CardModal";
import { EmptyState } from "@/components/EmptyState";
import { SearchFilters } from "@/components/SearchFilters";
import { DeckPanel } from "@/components/DeckPanel";
import { DeckMobileToggle } from "@/components/DeckMobileToggle";
import { KeyboardShortcutsHelp } from "@/components/KeyboardShortcutsHelp";
import { GoldfishSimulator } from "@/components/GoldfishSimulator";
import { ArchetypeExplorer } from "@/components/ArchetypeExplorer";
import { CollectionImport } from "@/components/CollectionImport";
import { DeckCollectionCheck } from "@/components/DeckCollectionCheck";
import { SavedDecksPanel } from "@/components/SavedDecksPanel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { searchCards, getRandomCard } from "@/lib/scryfall";
import { createEmptyDeck, addCardToDeck, Deck } from "@/lib/deck";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScryfallCard } from "@/types/card";
import { ChevronLeft, ChevronRight, Loader2, Search, Beaker, Package, Shuffle } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCard, setSelectedCard] = useState<ScryfallCard | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [deck, setDeck] = useState<Deck>(createEmptyDeck());
  const [hoveredCard, setHoveredCard] = useState<ScryfallCard | null>(null);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("search");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedRarities, setSelectedRarities] = useState<string[]>([]);

  // Build the search query with filters
  const fullQuery = useMemo(() => {
    let query = searchQuery;
    
    if (selectedColors.length > 0) {
      const colorQuery = selectedColors.join("");
      query += ` c:${colorQuery}`;
    }
    
    if (selectedRarities.length > 0) {
      const rarityQuery = selectedRarities.map(r => `r:${r}`).join(" or ");
      if (selectedRarities.length > 1) {
        query += ` (${rarityQuery})`;
      } else {
        query += ` ${rarityQuery}`;
      }
    }
    
    return query.trim();
  }, [searchQuery, selectedColors, selectedRarities]);

  const { data: searchResult, isLoading: isSearching } = useQuery({
    queryKey: ["cards", fullQuery, currentPage],
    queryFn: () => searchCards(fullQuery, currentPage),
    enabled: !!fullQuery,
    staleTime: 5 * 60 * 1000,
  });

  // Keyboard shortcuts
  const handleAddHoveredToDeck = useCallback(() => {
    if (hoveredCard) {
      setDeck((prev) => addCardToDeck(prev, hoveredCard, "mainboard"));
      toast.success(`Added ${hoveredCard.name} to deck`);
    }
  }, [hoveredCard]);

  const handleAddHoveredToSideboard = useCallback(() => {
    if (hoveredCard) {
      setDeck((prev) => addCardToDeck(prev, hoveredCard, "sideboard"));
      toast.success(`Added ${hoveredCard.name} to sideboard`);
    }
  }, [hoveredCard]);

  const handleViewHoveredDetails = useCallback(() => {
    if (hoveredCard) {
      setSelectedCard(hoveredCard);
    }
  }, [hoveredCard]);

  const handleRandomCard = useCallback(async () => {
    try {
      const card = await getRandomCard();
      setSelectedCard(card);
    } catch (error) {
      toast.error("Failed to fetch random card");
    }
  }, []);

  const handleFocusSearch = useCallback(() => {
    const searchInput = document.querySelector('input[placeholder*="looking for"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  }, []);

  const handleEscape = useCallback(() => {
    if (selectedCard) {
      setSelectedCard(null);
    } else if (showShortcutsHelp) {
      setShowShortcutsHelp(false);
    } else {
      setSearchQuery("");
      setSelectedColors([]);
      setSelectedRarities([]);
    }
  }, [selectedCard, showShortcutsHelp]);

  useKeyboardShortcuts([
    { key: "a", description: "Add to deck", action: handleAddHoveredToDeck },
    { key: "s", description: "Add to sideboard", action: handleAddHoveredToSideboard },
    { key: "v", description: "View details", action: handleViewHoveredDetails },
    { key: "r", description: "Random card", action: handleRandomCard },
    { key: "/", description: "Focus search", action: handleFocusSearch },
    { key: "Escape", description: "Clear/Close", action: handleEscape },
    { key: "?", shift: true, description: "Show shortcuts", action: () => setShowShortcutsHelp(true) },
  ]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    setHasSearched(true);
    setActiveTab("search");
  };

  const handleColorToggle = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color)
        ? prev.filter((c) => c !== color)
        : [...prev, color]
    );
    setCurrentPage(1);
    if (searchQuery) setHasSearched(true);
  };

  const handleRarityToggle = (rarity: string) => {
    setSelectedRarities((prev) =>
      prev.includes(rarity)
        ? prev.filter((r) => r !== rarity)
        : [...prev, rarity]
    );
    setCurrentPage(1);
    if (searchQuery) setHasSearched(true);
  };

  const handleClearFilters = () => {
    setSelectedColors([]);
    setSelectedRarities([]);
    setCurrentPage(1);
  };

  const handleAddToDeck = (card: ScryfallCard) => {
    setDeck((prev) => addCardToDeck(prev, card, "mainboard"));
    toast.success(`Added ${card.name} to deck`);
  };

  const handleAddToSideboard = (card: ScryfallCard) => {
    setDeck((prev) => addCardToDeck(prev, card, "sideboard"));
    toast.success(`Added ${card.name} to sideboard`);
  };

  const handleClearDeck = () => {
    setDeck(createEmptyDeck());
    toast.success("Deck cleared");
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLoadArchetype = (newDeck: Deck) => {
    setDeck(newDeck);
    setActiveTab("goldfish");
  };

  const handleLoadDeck = (loadedDeck: Deck) => {
    setDeck(loadedDeck);
    toast.success(`Loaded "${loadedDeck.name}"`);
  };

  const cards = searchResult?.data || [];
  const totalCards = searchResult?.total_cards || 0;
  const hasMore = searchResult?.has_more || false;

  const getCardQuantity = (cardId: string) => {
    const mainboardCard = deck.mainboard.find((dc) => dc.card.id === cardId);
    const sideboardCard = deck.sideboard.find((dc) => dc.card.id === cardId);
    return (mainboardCard?.quantity || 0) + (sideboardCard?.quantity || 0);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header onRandomCard={handleRandomCard} isLoading={false} />
      
      <div className="flex-1 flex">
        {/* Main Content */}
        <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8 max-w-6xl mx-auto w-full pb-24 md:pb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="w-full max-w-md mx-auto">
              <TabsTrigger value="search" className="flex-1 gap-2">
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Search</span>
              </TabsTrigger>
              <TabsTrigger value="archetypes" className="flex-1 gap-2">
                <Beaker className="h-4 w-4" />
                <span className="hidden sm:inline">Brews</span>
              </TabsTrigger>
              <TabsTrigger value="goldfish" className="flex-1 gap-2">
                <Shuffle className="h-4 w-4" />
                <span className="hidden sm:inline">Test</span>
              </TabsTrigger>
              <TabsTrigger value="collection" className="flex-1 gap-2">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Cards</span>
              </TabsTrigger>
            </TabsList>

            {/* Search Tab */}
            <TabsContent value="search" className="space-y-6 mt-6">
              <UnifiedSearchBar onSearch={handleSearch} isLoading={isSearching} />

              {/* Additional filters row */}
              {hasSearched && (
                <div className="flex items-center justify-between">
                  <SearchFilters
                    selectedColors={selectedColors}
                    selectedRarities={selectedRarities}
                    onColorToggle={handleColorToggle}
                    onRarityToggle={handleRarityToggle}
                    onClearFilters={handleClearFilters}
                    isOpen={showFilters}
                    onToggle={() => setShowFilters(!showFilters)}
                  />
                  {totalCards > 0 && (
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {totalCards.toLocaleString()} results
                    </span>
                  )}
                </div>
              )}

              {/* Cards Grid */}
              {cards.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {cards.map((card, index) => (
                      <div
                        key={card.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <CardItemWithDeck
                          card={card}
                          quantity={getCardQuantity(card.id)}
                          isHovered={hoveredCard?.id === card.id}
                          onHover={(hovered) => setHoveredCard(hovered ? card : null)}
                          onAddToDeck={() => handleAddToDeck(card)}
                          onAddToSideboard={() => handleAddToSideboard(card)}
                          onViewDetails={() => setSelectedCard(card)}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {(hasMore || currentPage > 1) && (
                    <div className="flex items-center justify-center gap-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1 || isSearching}
                        className="gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">Previous</span>
                      </Button>
                      <div className="px-4 py-2 text-sm text-muted-foreground tabular-nums">
                        Page {currentPage}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={!hasMore || isSearching}
                        className="gap-1"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              ) : isSearching ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                  <p className="mt-4 text-sm text-muted-foreground">Searching...</p>
                </div>
              ) : (
                <EmptyState hasSearched={hasSearched && !isSearching} />
              )}
            </TabsContent>

            {/* Archetypes Tab */}
            <TabsContent value="archetypes" className="mt-6">
              <ArchetypeExplorer onLoadArchetype={handleLoadArchetype} />
            </TabsContent>

            {/* Goldfish/Playtest Tab */}
            <TabsContent value="goldfish" className="space-y-6 mt-6">
              <GoldfishSimulator deck={deck} />
              <div className="grid gap-6 md:grid-cols-2">
                <SavedDecksPanel currentDeck={deck} onLoadDeck={handleLoadDeck} />
                <DeckCollectionCheck deck={deck} />
              </div>
            </TabsContent>

            {/* Collection Tab */}
            <TabsContent value="collection" className="mt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <CollectionImport />
                <DeckCollectionCheck deck={deck} />
              </div>
            </TabsContent>
          </Tabs>
        </main>

        {/* Deck Panel - Desktop */}
        <aside className="hidden md:block w-80 lg:w-96 flex-shrink-0 h-[calc(100vh-57px)] sticky top-[57px]">
          <DeckPanel deck={deck} onDeckChange={setDeck} onClearDeck={handleClearDeck} />
        </aside>
      </div>

      {/* Deck Panel - Mobile */}
      <DeckMobileToggle deck={deck} onDeckChange={setDeck} onClearDeck={handleClearDeck} />

      {/* Card Modal */}
      <CardModal
        card={selectedCard}
        open={!!selectedCard}
        onClose={() => setSelectedCard(null)}
      />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        open={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />
    </div>
  );
};

export default Index;