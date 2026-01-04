import { useState, useCallback, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { UnifiedSearchBar, SearchResult } from "@/components/UnifiedSearchBar";
import { SearchInterpretation } from "@/components/SearchInterpretation";
import { AffiliateNotice } from "@/components/AffiliateNotice";
import { CardItem } from "@/components/CardItem";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { searchCards } from "@/lib/scryfall";
import { ScryfallCard } from "@/types/card";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

// Lazy load heavy modal component
const CardModal = lazy(() => import("@/components/CardModal"));

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCard, setSelectedCard] = useState<ScryfallCard | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSearchResult, setLastSearchResult] = useState<SearchResult | null>(null);

  const {
    data: searchResult,
    isLoading: isSearching
  } = useQuery({
    queryKey: ["cards", searchQuery, currentPage],
    queryFn: () => searchCards(searchQuery, currentPage),
    enabled: !!searchQuery,
    staleTime: 5 * 60 * 1000
  });

  const handleSearch = useCallback((query: string, result?: SearchResult) => {
    setSearchQuery(query);
    setCurrentPage(1);
    setHasSearched(true);
    setLastSearchResult(result || null);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }, []);

  const cards = searchResult?.data || [];
  const totalCards = searchResult?.total_cards || 0;
  const hasMore = searchResult?.has_more || false;

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-background">
      {/* Header with subtle gradient accent */}
      <header className="border-b border-border/60 bg-gradient-to-r from-background via-background to-background sticky top-0 z-50 safe-top">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center shadow-sm">
              <span className="text-accent-foreground font-bold text-xs sm:text-sm">OM</span>
            </div>
            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">OffMeta</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-3 sm:px-4 py-4 sm:py-8 max-w-4xl mx-auto w-full safe-bottom">
        <div className="space-y-4 sm:space-y-8">
          {/* Search section */}
          <UnifiedSearchBar 
            onSearch={handleSearch} 
            isLoading={isSearching} 
            lastTranslatedQuery={lastSearchResult?.scryfallQuery}
          />

          {/* Search interpretation panel */}
          {lastSearchResult && hasSearched && !isSearching && (
            <SearchInterpretation 
              scryfallQuery={lastSearchResult.scryfallQuery}
              explanation={lastSearchResult.explanation}
            />
          )}

          {/* Results count */}
          {hasSearched && totalCards > 0 && (
            <div className="text-center">
              <span className="text-xs sm:text-sm text-muted-foreground tabular-nums">
                {totalCards.toLocaleString()} cards found
              </span>
            </div>
          )}

          {/* Affiliate notice for purchase-intent searches */}
          {lastSearchResult?.showAffiliate && cards.length > 0 && (
            <AffiliateNotice searchQuery={searchQuery} />
          )}

          {/* Cards Grid */}
          {cards.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
                {cards.map((card, index) => (
                  <div 
                    key={card.id} 
                    className="animate-fade-in" 
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <CardItem card={card} onClick={() => setSelectedCard(card)} />
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {(hasMore || currentPage > 1) && (
                <div className="flex items-center justify-center gap-2 sm:gap-3 pt-4 pb-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handlePageChange(currentPage - 1)} 
                    disabled={currentPage === 1 || isSearching} 
                    className="gap-1.5 h-10 px-3 sm:px-4"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>
                  <div className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-muted-foreground tabular-nums">
                    Page {currentPage}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handlePageChange(currentPage + 1)} 
                    disabled={!hasMore || isSearching} 
                    className="gap-1.5 h-10 px-3 sm:px-4"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          ) : isSearching ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground animate-spin" />
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-muted-foreground">Searching Scryfall...</p>
            </div>
          ) : null}
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Card Modal - lazy loaded */}
      <Suspense fallback={null}>
        <CardModal card={selectedCard} open={!!selectedCard} onClose={() => setSelectedCard(null)} />
      </Suspense>
    </div>
  );
};

export default Index;
