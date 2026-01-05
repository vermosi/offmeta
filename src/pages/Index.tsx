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
      <div className="min-h-screen min-h-[100dvh] flex flex-col bg-background relative overflow-hidden">
        {/* Ambient background effects */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-50%] left-[-50%] w-[100%] h-[100%] bg-gradient-radial from-primary/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-[-30%] right-[-30%] w-[80%] h-[80%] bg-gradient-radial from-primary/3 to-transparent rounded-full blur-3xl" />
        </div>

        {/* Header */}
        <header className="relative z-50 safe-top">
          <div className="glass-strong border-b border-border/50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
              <a href="/" className="group flex items-center gap-3 min-h-0">
                <div className="relative">
                  <svg 
                    viewBox="0 0 32 32" 
                    className="h-10 w-10 text-primary transition-transform duration-500 group-hover:scale-110"
                    aria-hidden="true"
                  >
                    <path d="M16 2L30 16L16 30L2 16L16 2Z" fill="currentColor" opacity="0.15"/>
                    <path d="M16 2L30 16L16 30L2 16L16 2Z" stroke="currentColor" strokeWidth="2" fill="none" className="line-draw"/>
                    <path d="M8 16C8 16 11 11 16 11C21 11 24 16 24 16C24 16 21 21 16 21C11 21 8 16 8 16Z" fill="currentColor" opacity="0.2"/>
                    <path d="M8 16C8 16 11 11 16 11C21 11 24 16 24 16C24 16 21 21 16 21C11 21 8 16 8 16Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <circle cx="16" cy="16" r="3" fill="currentColor"/>
                  </svg>
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">
                  OffMeta
                </span>
              </a>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Hero Section - only show before search */}
        {!hasSearched && (
          <section className="relative z-10 pt-16 sm:pt-24 lg:pt-32 pb-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center stagger-children">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">AI-Powered Card Search</span>
              </div>
              
              <h1 className="text-gradient glow-text leading-[1.1] mb-6">
                Find Magic Cards<br />
                <span className="text-foreground">Like You Think</span>
              </h1>
              
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
                Describe what you're looking for in plain English. 
                No complex syntax, no guessing — just natural conversation.
              </p>
            </div>
          </section>
        )}

        {/* Main content */}
        <main className={`relative z-10 flex-1 px-4 sm:px-6 lg:px-8 ${hasSearched ? 'pt-8' : ''} pb-8 max-w-6xl mx-auto w-full safe-bottom`}>
          <div className="space-y-8 sm:space-y-12">
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
              <div className="text-center animate-reveal">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-muted-foreground tabular-nums">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                  {cards.map((card, index) => (
                    <div 
                      key={card.id} 
                      className="animate-reveal" 
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <CardItem card={card} onClick={() => setSelectedCard(card)} />
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {(hasMore || currentPage > 1) && (
                  <div className="flex items-center justify-center gap-4 pt-8">
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={() => handlePageChange(currentPage - 1)} 
                      disabled={currentPage === 1 || isSearching} 
                      className="gap-2 magnetic glass border-border/50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </Button>
                    <div className="px-6 py-3 rounded-full glass text-sm font-medium text-muted-foreground tabular-nums">
                      Page {currentPage}
                    </div>
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={() => handlePageChange(currentPage + 1)} 
                      disabled={!hasMore || isSearching} 
                      className="gap-2 magnetic glass border-border/50"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : isSearching ? (
              <div className="flex flex-col items-center justify-center py-24 animate-reveal">
                <div className="relative">
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
                </div>
                <p className="mt-6 text-muted-foreground">Searching the multiverse...</p>
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