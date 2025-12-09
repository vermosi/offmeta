import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { CardItemWithDeck } from "@/components/CardItemWithDeck";
import { CardModal } from "@/components/CardModal";
import { EmptyState } from "@/components/EmptyState";
import { SearchFilters } from "@/components/SearchFilters";
import { DeckPanel } from "@/components/DeckPanel";
import { DeckMobileToggle } from "@/components/DeckMobileToggle";
import { Button } from "@/components/ui/button";
import { searchCards, getRandomCard } from "@/lib/scryfall";
import { createEmptyDeck, addCardToDeck, Deck } from "@/lib/deck";
import { ScryfallCard } from "@/types/card";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCard, setSelectedCard] = useState<ScryfallCard | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [deck, setDeck] = useState<Deck>(createEmptyDeck());
  
  // Filters
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

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    setHasSearched(true);
  };

  const handleRandomCard = async () => {
    try {
      const card = await getRandomCard();
      setSelectedCard(card);
    } catch (error) {
      toast.error("Failed to fetch random card");
    }
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

  const cards = searchResult?.data || [];
  const totalCards = searchResult?.total_cards || 0;
  const hasMore = searchResult?.has_more || false;

  // Get quantity of each card in deck
  const getCardQuantity = (cardId: string) => {
    const mainboardCard = deck.mainboard.find((dc) => dc.card.id === cardId);
    const sideboardCard = deck.sideboard.find((dc) => dc.card.id === cardId);
    return (mainboardCard?.quantity || 0) + (sideboardCard?.quantity || 0);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header onRandomCard={handleRandomCard} isLoading={false} />
      
      <div className="flex-1 flex">
        {/* Main Content */}
        <main className="flex-1 container px-4 py-8 max-w-6xl">
          {/* Search Section */}
          <div className="mb-8 space-y-4">
            <SearchBar onSearch={handleSearch} isLoading={isSearching} />
            <SearchFilters
              selectedColors={selectedColors}
              selectedRarities={selectedRarities}
              onColorToggle={handleColorToggle}
              onRarityToggle={handleRarityToggle}
              onClearFilters={handleClearFilters}
              isOpen={showFilters}
              onToggle={() => setShowFilters(!showFilters)}
            />
          </div>

          {/* Results count */}
          {fullQuery && totalCards > 0 && (
            <div className="mb-6 flex items-center justify-between">
              <p className="text-muted-foreground">
                Found <span className="font-semibold text-foreground">{totalCards.toLocaleString()}</span> cards
              </p>
              <p className="text-sm text-muted-foreground">
                Page {currentPage}
              </p>
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
                      onAddToDeck={() => handleAddToDeck(card)}
                      onAddToSideboard={() => handleAddToSideboard(card)}
                      onViewDetails={() => setSelectedCard(card)}
                    />
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {(hasMore || currentPage > 1) && (
                <div className="mt-12 flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isSearching}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  <span className="text-muted-foreground px-4">
                    Page {currentPage}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!hasMore || isSearching}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </>
          ) : isSearching ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <p className="mt-4 text-muted-foreground">Summoning cards...</p>
            </div>
          ) : (
            <EmptyState hasSearched={hasSearched && !isSearching} />
          )}
        </main>

        {/* Deck Panel - Desktop */}
        <aside className="hidden md:block w-80 lg:w-96 flex-shrink-0 h-[calc(100vh-64px)] sticky top-16">
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
    </div>
  );
};

export default Index;
