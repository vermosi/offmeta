import { useState, useCallback, useRef, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { UnifiedSearchBar, SearchResult, UnifiedSearchBarHandle } from "@/components/UnifiedSearchBar";
import { SearchInterpretation } from "@/components/SearchInterpretation";
import { SearchFilters } from "@/components/SearchFilters";

import { CardItem } from "@/components/CardItem";
import { EmptyState } from "@/components/EmptyState";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { searchCards } from "@/lib/scryfall";
import { ScryfallCard } from "@/types/card";
import { useAnalytics } from "@/hooks/useAnalytics";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const CardModal = lazy(() => import("@/components/CardModal"));

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCard, setSelectedCard] = useState<ScryfallCard | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSearchResult, setLastSearchResult] = useState<SearchResult | null>(null);
  const [filteredCards, setFilteredCards] = useState<ScryfallCard[]>([]);
  const searchBarRef = useRef<UnifiedSearchBarHandle>(null);
  const { trackSearch, trackCardClick, trackPagination } = useAnalytics();

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
    
    // Track search analytics
    if (result) {
      trackSearch({
        query,
        translated_query: result.scryfallQuery,
        results_count: 0, // Will be updated when results come in
      });
    }
  }, [trackSearch]);

  const handlePageChange = useCallback((newPage: number) => {
    // Track pagination
    trackPagination({
      query: searchQuery,
      from_page: currentPage,
      to_page: newPage,
    });
    
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage, searchQuery, trackPagination]);

  const handleCardClick = useCallback((card: ScryfallCard, index: number) => {
    // Track card click
    trackCardClick({
      card_id: card.id,
      card_name: card.name,
      set_code: card.set,
      rarity: card.rarity,
      position_in_results: index,
    });
    
    setSelectedCard(card);
  }, [trackCardClick]);

  const handleTryExample = useCallback((query: string) => {
    searchBarRef.current?.triggerSearch(query);
  }, []);

  const cards = searchResult?.data || [];
  const totalCards = searchResult?.total_cards || 0;
  const hasMore = searchResult?.has_more || false;
  
  // Use filtered cards for display, fall back to all cards if no filtering applied
  const displayCards = filteredCards.length > 0 || cards.length === 0 ? filteredCards : cards;

  const handleFilteredCards = useCallback((filtered: ScryfallCard[]) => {
    setFilteredCards(filtered);
  }, []);

  return (
    <ErrorBoundary>
      <div className="min-h-screen min-h-[100dvh] flex flex-col bg-background">
        {/* Skip link */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {/* Header - Clean, minimal, sticky with blur */}
        <header 
          className="sticky top-0 z-50 safe-top border-b border-border/50 bg-background/80 backdrop-blur-xl"
          role="banner"
        >
          <div className="container-main py-4 flex items-center justify-between">
            <a 
              href="/" 
              className="group flex items-center gap-2.5 min-h-0 focus-ring rounded-lg -ml-2 px-2 py-1"
              aria-label="OffMeta - Home"
            >
              <svg 
                viewBox="0 0 32 32" 
                className="h-8 w-8 transition-transform duration-200 group-hover:scale-105"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(300, 90%, 60%)" />
                    <stop offset="100%" stopColor="hsl(195, 95%, 55%)" />
                  </linearGradient>
                </defs>
                <path d="M16 2L30 16L16 30L2 16L16 2Z" fill="url(#logoGradient)" opacity="0.15"/>
                <path d="M16 2L30 16L16 30L2 16L16 2Z" stroke="url(#logoGradient)" strokeWidth="1.5" fill="none"/>
                <path d="M8 16C8 16 11 11 16 11C21 11 24 16 24 16C24 16 21 21 16 21C11 21 8 16 8 16Z" stroke="url(#logoGradient)" strokeWidth="1.25" fill="none"/>
                <circle cx="16" cy="16" r="2" fill="url(#logoGradient)"/>
              </svg>
              <span className="text-lg font-semibold tracking-tight">
                OffMeta
              </span>
            </a>
            <ThemeToggle />
          </div>
        </header>

        {/* Hero Section - Large, airy, centered */}
        {!hasSearched && (
          <section 
            className="relative pt-20 sm:pt-28 lg:pt-36 pb-8 sm:pb-12"
            aria-labelledby="hero-heading"
          >
            <div className="container-main text-center stagger-children">
              <h1 
                id="hero-heading"
                className="mb-6 text-foreground"
              >
                Find Magic Cards
                <br />
                <span className="text-accent-glow">Like You Think</span>
              </h1>
              
              <div className="space-y-1 mb-16 sm:mb-20">
                <p className="text-body-lg sm:text-xl text-muted-foreground">
                  Describe what you're looking for in plain English.
                </p>
                <p className="text-body-lg sm:text-xl text-muted-foreground">
                  No complex syntax. No guessing.
                </p>
                <p className="text-body-lg sm:text-xl text-foreground font-medium mt-3">
                  Just natural conversation.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Main content */}
        <main 
          id="main-content"
          className={`relative flex-1 ${hasSearched ? 'pt-8' : ''} pb-16 sm:pb-24 container-main safe-bottom`}
          role="main"
        >
          <div className="space-y-10 sm:space-y-12">
            {/* Search */}
            <UnifiedSearchBar 
              ref={searchBarRef}
              onSearch={handleSearch} 
              isLoading={isSearching} 
              lastTranslatedQuery={lastSearchResult?.scryfallQuery}
            />

            {/* Search interpretation */}
            {lastSearchResult && hasSearched && !isSearching && (
              <div className="animate-reveal">
                <SearchInterpretation 
                  scryfallQuery={lastSearchResult.scryfallQuery}
                  explanation={lastSearchResult.explanation}
                />
              </div>
            )}

            {/* Results count */}
            {hasSearched && totalCards > 0 && (
              <div 
                className="text-center animate-reveal"
                role="status"
                aria-live="polite"
              >
                <span className="pill">
                  <span 
                    className="h-1.5 w-1.5 rounded-full bg-accent" 
                    aria-hidden="true"
                  />
                  {totalCards.toLocaleString()} cards found
                </span>
              </div>
            )}


            {/* Filters and Sort - Show when we have results */}
            {cards.length > 0 && !isSearching && (
              <SearchFilters 
                cards={cards} 
                onFilteredCards={handleFilteredCards}
                totalCards={totalCards}
              />
            )}

            {/* Cards Grid */}
            {cards.length > 0 ? (
              <>
                {displayCards.length > 0 ? (
                  <div 
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5"
                    role="list"
                    aria-label="Search results"
                  >
                    {displayCards.map((card, index) => (
                      <div 
                        key={card.id} 
                        className="animate-reveal"
                        role="listitem"
                        style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
                      >
                        <CardItem card={card} onClick={() => handleCardClick(card, index)} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No cards match your filters.</p>
                    <p className="text-sm text-muted-foreground mt-1">Try adjusting your filter criteria.</p>
                  </div>
                )}

                {/* Pagination */}
                {(hasMore || currentPage > 1) && (
                  <nav 
                    className="flex items-center justify-center gap-3 pt-8"
                    aria-label="Pagination"
                  >
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={() => handlePageChange(currentPage - 1)} 
                      disabled={currentPage === 1 || isSearching} 
                      className="gap-2 magnetic"
                      aria-label="Go to previous page"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden sm:inline">Previous</span>
                    </Button>
                    <div 
                      className="pill tabular-nums"
                      aria-current="page"
                    >
                      Page {currentPage}
                    </div>
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={() => handlePageChange(currentPage + 1)} 
                      disabled={!hasMore || isSearching} 
                      className="gap-2 magnetic"
                      aria-label="Go to next page"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </nav>
                )}
              </>
            ) : isSearching ? (
              <div 
                className="flex flex-col items-center justify-center py-24 animate-reveal"
                role="status"
                aria-live="polite"
                aria-busy="true"
              >
                <Loader2 
                  className="h-8 w-8 text-muted-foreground animate-spin" 
                  aria-hidden="true"
                />
                <p className="mt-4 text-muted-foreground">Searching...</p>
                <span className="sr-only">Loading search results</span>
              </div>
            ) : hasSearched && totalCards === 0 ? (
              <EmptyState query={searchQuery} onTryExample={handleTryExample} />
            ) : null}
          </div>
        </main>

        {/* Footer */}
        <Footer />

        {/* Card Modal */}
        {selectedCard && (
          <Suspense fallback={null}>
            <CardModal card={selectedCard} open={true} onClose={() => setSelectedCard(null)} />
          </Suspense>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default Index;