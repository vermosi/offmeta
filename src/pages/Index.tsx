import { useState, useCallback, useRef, lazy, Suspense, useMemo, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { UnifiedSearchBar, SearchResult, UnifiedSearchBarHandle } from "@/components/UnifiedSearchBar";
import { SearchInterpretation } from "@/components/SearchInterpretation";
import { SearchFilters } from "@/components/SearchFilters";

import { CardItem } from "@/components/CardItem";
import { CardSkeletonGrid } from "@/components/CardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Footer } from "@/components/Footer";
import { FAQSection } from "@/components/FAQSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ThemeToggle } from "@/components/ThemeToggle";
import { searchCards } from "@/lib/scryfall";
import { ScryfallCard } from "@/types/card";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Loader2 } from "lucide-react";

const CardModal = lazy(() => import("@/components/CardModal"));

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [originalQuery, setOriginalQuery] = useState(initialQuery); // Natural language query
  const [selectedCard, setSelectedCard] = useState<ScryfallCard | null>(null);
  const [hasSearched, setHasSearched] = useState(!!initialQuery);
  const [lastSearchResult, setLastSearchResult] = useState<SearchResult | null>(null);
  const [filteredCards, setFilteredCards] = useState<ScryfallCard[]>([]);
  const searchBarRef = useRef<UnifiedSearchBarHandle>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { trackSearch, trackCardClick } = useAnalytics();

  // Trigger search from URL on initial load
  useEffect(() => {
    if (initialQuery && searchBarRef.current) {
      searchBarRef.current.triggerSearch(initialQuery);
    }
  }, []); // Run once on mount

  const {
    data,
    isLoading: isSearching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["cards", searchQuery],
    queryFn: ({ pageParam = 1 }) => searchCards(searchQuery, pageParam),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.has_more ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!searchQuery,
    staleTime: 5 * 60 * 1000,
  });

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleSearch = useCallback((query: string, result?: SearchResult, naturalQuery?: string) => {
    setSearchQuery(query);
    setOriginalQuery(naturalQuery || query); // Store the natural language query
    setHasSearched(true);
    setLastSearchResult(result || null);
    setFilteredCards([]); // Reset filters on new search
    
    // Update URL with search query
    if (query) {
      setSearchParams({ q: query }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
    
    // Track search analytics
    if (result) {
      trackSearch({
        query: naturalQuery || query,
        translated_query: result.scryfallQuery,
        results_count: 0, // Will be updated when results come in
      });
    }
  }, [trackSearch, setSearchParams]);

  // Handler for "Did you mean...?" suggestions
  const handleTryAlternative = useCallback((alternativeQuery: string) => {
    searchBarRef.current?.triggerSearch(alternativeQuery);
  }, []);

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

  // Flatten all pages into a single array
  const cards = useMemo(() => {
    return data?.pages.flatMap(page => page.data) || [];
  }, [data]);
  
  const totalCards = data?.pages[0]?.total_cards || 0;
  
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
            <Link 
              to="/" 
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
            </Link>
            <ThemeToggle />
          </div>
        </header>

        {/* Hero Section - Compact mobile, airy desktop */}
        {!hasSearched && (
          <section 
            className="relative pt-8 sm:pt-16 lg:pt-24 pb-4 sm:pb-8"
            aria-labelledby="hero-heading"
          >
            <div className="container-main text-center stagger-children">
              <h1 
                id="hero-heading"
                className="mb-4 sm:mb-6 text-foreground text-3xl sm:text-5xl lg:text-6xl"
              >
                Find Magic Cards
                <br />
                <span className="text-accent-glow">Like You Think</span>
              </h1>
              
              <div className="space-y-0.5 sm:space-y-1 mb-8 sm:mb-12">
                <p className="text-sm sm:text-lg text-muted-foreground">
                  Describe what you're looking for in plain English.
                </p>
                <p className="text-sm sm:text-lg text-muted-foreground">
                  No complex syntax. No guessing.
                </p>
                <p className="text-sm sm:text-lg text-foreground font-medium mt-2">
                  Just natural conversation.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Main content */}
        <main 
          id="main-content"
          className={`relative flex-1 ${hasSearched ? 'pt-4 sm:pt-6' : ''} pb-8 sm:pb-16 container-main safe-bottom`}
          role="main"
        >
          <div className="space-y-6 sm:space-y-10">
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
                  originalQuery={originalQuery}
                  explanation={lastSearchResult.explanation}
                  onTryAlternative={handleTryAlternative}
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
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4 content-visibility-auto"
                    role="list"
                    aria-label="Search results"
                  >
                    {displayCards.map((card, index) => (
                      <div 
                        key={card.id} 
                        className="animate-reveal contain-layout"
                        role="listitem"
                        style={{ 
                          animationDelay: `${Math.min(index * 25, 300)}ms`,
                          contentVisibility: 'auto',
                          containIntrinsicSize: '0 200px'
                        }}
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

                {/* Infinite scroll trigger */}
                <div 
                  ref={loadMoreRef} 
                  className="flex justify-center pt-8 pb-4"
                  aria-hidden="true"
                >
                  {isFetchingNextPage && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Loading more cards...</span>
                    </div>
                  )}
                  {!hasNextPage && cards.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      You've reached the end • {totalCards.toLocaleString()} cards total
                    </span>
                  )}
                </div>
              </>
            ) : isSearching ? (
              <CardSkeletonGrid count={10} />
            ) : hasSearched && totalCards === 0 ? (
              <EmptyState query={searchQuery} onTryExample={handleTryExample} />
            ) : null}
          </div>
        </main>

        {/* How It Works & FAQ - Show on landing page */}
        {!hasSearched && (
          <>
            <HowItWorksSection />
            <FAQSection />
          </>
        )}

        {/* Footer */}
        <Footer />

        {/* Scroll to top button */}
        <ScrollToTop threshold={800} />

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