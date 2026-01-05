import { useState, useCallback, useRef, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { UnifiedSearchBar, SearchResult, UnifiedSearchBarHandle } from "@/components/UnifiedSearchBar";
import { SearchInterpretation } from "@/components/SearchInterpretation";
import { AffiliateNotice } from "@/components/AffiliateNotice";
import { CardItem } from "@/components/CardItem";
import { EmptyState } from "@/components/EmptyState";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { searchCards } from "@/lib/scryfall";
import { ScryfallCard } from "@/types/card";
import { ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";

const CardModal = lazy(() => import("@/components/CardModal"));

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCard, setSelectedCard] = useState<ScryfallCard | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSearchResult, setLastSearchResult] = useState<SearchResult | null>(null);
  const searchBarRef = useRef<UnifiedSearchBarHandle>(null);

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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleTryExample = useCallback((query: string) => {
    searchBarRef.current?.triggerSearch(query);
  }, []);

  const cards = searchResult?.data || [];
  const totalCards = searchResult?.total_cards || 0;
  const hasMore = searchResult?.has_more || false;

  return (
    <ErrorBoundary>
      <div className="min-h-screen min-h-[100dvh] flex flex-col bg-background grain gradient-bg">
        {/* Skip link for keyboard accessibility */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {/* Header */}
        <header 
          className="relative z-50 safe-top"
          role="banner"
        >
          <div className="glass-strong border-b border-border/30">
            <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-5 flex items-center justify-between">
              <a 
                href="/" 
                className="group flex items-center gap-3 min-h-0 focus-ring rounded-lg"
                aria-label="OffMeta - Home"
              >
                <div className="relative">
                  <svg 
                    viewBox="0 0 32 32" 
                    className="h-10 w-10 text-foreground transition-transform duration-500 group-hover:scale-110"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M16 2L30 16L16 30L2 16L16 2Z" fill="currentColor" opacity="0.06"/>
                    <path d="M16 2L30 16L16 30L2 16L16 2Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <path d="M8 16C8 16 11 11 16 11C21 11 24 16 24 16C24 16 21 21 16 21C11 21 8 16 8 16Z" fill="currentColor" opacity="0.1"/>
                    <path d="M8 16C8 16 11 11 16 11C21 11 24 16 24 16C24 16 21 21 16 21C11 21 8 16 8 16Z" stroke="currentColor" strokeWidth="1.25" fill="none"/>
                    <circle cx="16" cy="16" r="2.5" fill="currentColor"/>
                  </svg>
                  {/* Glow effect on hover */}
                  <div 
                    className="absolute inset-0 bg-accent/30 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    aria-hidden="true"
                  />
                </div>
                <span className="text-xl font-semibold tracking-tight text-foreground">
                  OffMeta
                </span>
              </a>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Hero Section - only show before search */}
        {!hasSearched && (
          <section 
            className="relative z-10 pt-24 sm:pt-32 lg:pt-40 pb-12 px-6 sm:px-8 lg:px-12"
            aria-labelledby="hero-heading"
          >
            <div className="max-w-4xl mx-auto text-center stagger-children">
              {/* Eyebrow badge */}
              <div className="mb-8">
                <span className="pill-accent">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Natural Language Search
                </span>
              </div>
              
              <h1 
                id="hero-heading"
                className="leading-[0.95] mb-10 text-foreground font-bold"
              >
                Find Magic Cards
                <br />
                <span className="text-accent glow-text">Like You Think</span>
              </h1>
              
              <div className="space-y-3 mb-20">
                <p className="text-xl sm:text-2xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                  Describe what you're looking for in plain English.
                </p>
                <p className="text-xl sm:text-2xl text-muted-foreground leading-relaxed">
                  No complex syntax. No guessing.
                </p>
                <p className="text-xl sm:text-2xl text-foreground font-medium leading-relaxed">
                  Just natural conversation.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Main content */}
        <main 
          id="main-content"
          className={`relative z-10 flex-1 px-6 sm:px-8 lg:px-12 ${hasSearched ? 'pt-10' : ''} pb-12 max-w-6xl mx-auto w-full safe-bottom`}
          role="main"
        >
          <div className="space-y-10 sm:space-y-14">
            {/* Search section */}
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
                    className="h-2 w-2 rounded-full bg-accent animate-pulse" 
                    aria-hidden="true"
                  />
                  {totalCards.toLocaleString()} cards found
                </span>
              </div>
            )}

            {/* Affiliate notice */}
            {lastSearchResult?.showAffiliate && cards.length > 0 && (
              <AffiliateNotice searchQuery={searchQuery} />
            )}

            {/* Cards Grid */}
            {cards.length > 0 ? (
              <>
                <div 
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 sm:gap-6"
                  role="list"
                  aria-label="Search results"
                >
                  {cards.map((card, index) => (
                    <div 
                      key={card.id} 
                      className="animate-reveal"
                      role="listitem"
                      style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}
                    >
                      <CardItem card={card} onClick={() => setSelectedCard(card)} />
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {(hasMore || currentPage > 1) && (
                  <nav 
                    className="flex items-center justify-center gap-4 pt-10"
                    aria-label="Pagination"
                  >
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={() => handlePageChange(currentPage - 1)} 
                      disabled={currentPage === 1 || isSearching} 
                      className="gap-2 magnetic glass border-border/50"
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
                      className="gap-2 magnetic glass border-border/50"
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
                className="flex flex-col items-center justify-center py-28 animate-reveal"
                role="status"
                aria-live="polite"
                aria-busy="true"
              >
                <div className="relative">
                  <Loader2 
                    className="h-12 w-12 text-accent animate-spin" 
                    aria-hidden="true"
                  />
                  <div 
                    className="absolute inset-0 bg-accent/30 rounded-full blur-2xl animate-pulse"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-8 text-lg text-muted-foreground">Searching the multiverse...</p>
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