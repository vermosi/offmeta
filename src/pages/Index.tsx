import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { SearchBar } from "@/components/SearchBar";
import { CardGrid } from "@/components/CardGrid";
import { CardModal } from "@/components/CardModal";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { searchCards, getRandomCard } from "@/lib/scryfall";
import { ScryfallCard } from "@/types/card";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCard, setSelectedCard] = useState<ScryfallCard | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: searchResult, isLoading: isSearching } = useQuery({
    queryKey: ["cards", searchQuery, currentPage],
    queryFn: () => searchCards(searchQuery, currentPage),
    enabled: !!searchQuery,
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
      toast({
        title: "Error",
        description: "Failed to fetch random card. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cards = searchResult?.data || [];
  const totalCards = searchResult?.total_cards || 0;
  const hasMore = searchResult?.has_more || false;

  return (
    <div className="min-h-screen">
      <Header onRandomCard={handleRandomCard} isLoading={false} />
      
      <main className="container px-4 py-8">
        {/* Hero Section */}
        <div className="mb-12">
          <SearchBar onSearch={handleSearch} isLoading={isSearching} />
        </div>

        {/* Results count */}
        {searchQuery && totalCards > 0 && (
          <div className="mb-6 flex items-center justify-between">
            <p className="text-muted-foreground">
              Found <span className="font-semibold text-foreground">{totalCards.toLocaleString()}</span> cards
            </p>
            <p className="text-sm text-muted-foreground">
              Page {currentPage}
            </p>
          </div>
        )}

        {/* Cards or Empty State */}
        {cards.length > 0 ? (
          <>
            <CardGrid
              cards={cards}
              isLoading={isSearching}
              onCardClick={setSelectedCard}
            />

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
