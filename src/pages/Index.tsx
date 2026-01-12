import { useState, useCallback, useRef, lazy, Suspense, useMemo, useEffect } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { UnifiedSearchBar, SearchResult, UnifiedSearchBarHandle } from "@/components/UnifiedSearchBar";
import { EditableQueryBar } from "@/components/EditableQueryBar";
import { ExplainCompilationPanel } from "@/components/ExplainCompilationPanel";
import { ReportIssueDialog } from "@/components/ReportIssueDialog";
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
import { FilterState } from "@/types/filters";
import { SearchIntent } from "@/types/search";
import { buildFilterQuery, validateScryfallQuery } from "@/lib/scryfallQuery";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Loader2 } from "lucide-react";

const CardModal = lazy(() => import("@/components/CardModal"));

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [originalQuery, setOriginalQuery] = useState(urlQuery); // Natural language query
  const [selectedCard, setSelectedCard] = useState<ScryfallCard | null>(null);
  const [hasSearched, setHasSearched] = useState(!!urlQuery);
  const [lastSearchResult, setLastSearchResult] = useState<SearchResult | null>(null);
  const [filteredCards, setFilteredCards] = useState<ScryfallCard[]>([]);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState | null>(null);
  const [lastIntent, setLastIntent] = useState<SearchIntent | null>(null);
  
  const searchBarRef = useRef<UnifiedSearchBarHandle>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { trackSearch, trackCardClick, trackEvent } = useAnalytics();

  // Sync state with URL changes (browser back/forward, manual URL edits)
  useEffect(() => {
    if (urlQuery && searchBarRef.current) {
      // Only trigger search if URL query differs from current search
      if (urlQuery !== searchQuery) {
        searchBarRef.current.triggerSearch(urlQuery);
      }
    } else if (!urlQuery && hasSearched) {
      // URL cleared - reset to landing state
      setSearchQuery("");
      setOriginalQuery("");
      setHasSearched(false);
      setLastSearchResult(null);
      setFilteredCards([]);
      setHasActiveFilters(false);
      setCurrentRequestId(null);
    }
  }, [urlQuery]); // Re-run when URL query changes

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
    // Generate new request ID for every search
    const requestId = generateRequestId();
    setCurrentRequestId(requestId);
    
    // Clear prior state before setting new values
    setFilteredCards([]);
    setHasActiveFilters(false);
    
    const filterQuery = buildFilterQuery(activeFilters);
    const executedQuery = [query, filterQuery].filter(Boolean).join(' ').trim();

    setSearchQuery(executedQuery);
    setOriginalQuery(naturalQuery || query);
    setHasSearched(true);
    if (result) {
      setLastSearchResult({
        ...result,
        scryfallQuery: executedQuery
      });
      setLastIntent(result.intent || null);
    } else {
      setLastSearchResult({
        scryfallQuery: executedQuery,
        explanation: undefined,
        showAffiliate: false
      });
      setLastIntent(null);
    }
    
    // Invalidate previous query cache to force fresh fetch
    queryClient.invalidateQueries({ queryKey: ["cards", searchQuery] });
    
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
        results_count: 0,
      });
    }
  }, [trackSearch, setSearchParams, queryClient, searchQuery, activeFilters]);

  // Handle re-running with an edited Scryfall query (bypasses AI translation)
  const handleRerunEditedQuery = useCallback((editedQuery: string) => {
    const requestId = generateRequestId();
    setCurrentRequestId(requestId);
    
    // Clear prior state
    setFilteredCards([]);
    setHasActiveFilters(false);
    
    const filterQuery = buildFilterQuery(activeFilters);
    const combinedQuery = [editedQuery, filterQuery].filter(Boolean).join(' ').trim();
    const validation = validateScryfallQuery(combinedQuery);
    if (!validation.valid) {
      setLastSearchResult(prev => prev ? {
        ...prev,
        scryfallQuery: validation.sanitized,
        validationIssues: validation.issues
      } : {
        scryfallQuery: validation.sanitized,
        validationIssues: validation.issues,
        explanation: undefined,
        showAffiliate: false
      });
      return;
    }

    // Set the edited query as both search and displayed query
    setSearchQuery(validation.sanitized);
    setHasSearched(true);
    
    // Update last search result with edited query
    setLastSearchResult(prev => prev ? {
      ...prev,
      scryfallQuery: validation.sanitized,
      validationIssues: []
    } : {
      scryfallQuery: validation.sanitized,
      explanation: undefined,
      showAffiliate: false,
      validationIssues: []
    });
    
    // Invalidate cache and force new fetch
    queryClient.invalidateQueries({ queryKey: ["cards"] });
    
    // Update URL
    setSearchParams({ q: validation.sanitized }, { replace: true });
    
    trackEvent('rerun_edited_query', {
      original_query: originalQuery,
      edited_query: editedQuery,
      request_id: requestId,
    });
  }, [queryClient, setSearchParams, originalQuery, trackEvent, activeFilters]);

  // Handler for "Did you mean...?" suggestions
  const handleTryAlternative = useCallback((alternativeQuery: string) => {
    searchBarRef.current?.triggerSearch(alternativeQuery);
  }, []);

  const handleCardClick = useCallback((card: ScryfallCard, index: number) => {
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

  const handleRegenerateTranslation = useCallback(() => {
    if (!originalQuery) return;
    searchBarRef.current?.triggerSearch(originalQuery, {
      bypassCache: true,
      cacheSalt: `${Date.now()}`
    });
  }, [originalQuery]);

  // Flatten all pages into a single array
  const cards = useMemo(() => {
    return data?.pages.flatMap(page => page.data) || [];
  }, [data]);
  
  const totalCards = data?.pages[0]?.total_cards || 0;

  // Track actual results count when data arrives
  useEffect(() => {
    if (totalCards > 0 && lastSearchResult) {
      trackEvent('search_results', {
        query: originalQuery,
        translated_query: lastSearchResult.scryfallQuery,
        results_count: totalCards,
        request_id: currentRequestId,
      });
    }
  }, [totalCards, lastSearchResult?.scryfallQuery, originalQuery, trackEvent, currentRequestId]);

  const handleFilteredCards = useCallback((filtered: ScryfallCard[], filtersActive: boolean, filters: FilterState) => {
    setFilteredCards(filtered);
    setHasActiveFilters(filtersActive);
    setActiveFilters(filters);
  }, []);
  
  // Use filtered cards for display when filters are active, otherwise show all cards
  const displayCards = hasActiveFilters ? filteredCards : cards;

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
          <div className="space-y-6 sm:space-y-8">
            {/* Search */}
            <UnifiedSearchBar 
              ref={searchBarRef}
              onSearch={handleSearch} 
              isLoading={isSearching} 
              lastTranslatedQuery={lastSearchResult?.scryfallQuery}
              filters={activeFilters}
            />

            {/* Always-visible Editable Query Bar */}
            {hasSearched && (
              <div className="animate-reveal">
                <EditableQueryBar
                  scryfallQuery={(lastSearchResult?.scryfallQuery || searchQuery).trim()}
                  originalQuery={originalQuery}
                  confidence={lastSearchResult?.explanation?.confidence}
                  isLoading={isSearching}
                  onRerun={handleRerunEditedQuery}
                  onRegenerate={handleRegenerateTranslation}
                  onReportIssue={() => setReportDialogOpen(true)}
                  requestId={currentRequestId || undefined}
                  filters={activeFilters}
                  validationError={lastSearchResult?.validationIssues?.length ? lastSearchResult.validationIssues.join(' • ') : null}
                />
              </div>
            )}

            {hasSearched && (
              <div className="animate-reveal">
                <ExplainCompilationPanel intent={lastSearchResult?.intent || lastIntent} />
              </div>
            )}

            {/* Results count */}
            {hasSearched && totalCards > 0 && !isSearching && (
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

        {/* Report Issue Dialog */}
        <ReportIssueDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          originalQuery={originalQuery}
          compiledQuery={lastSearchResult?.scryfallQuery || searchQuery}
          filters={activeFilters}
          requestId={currentRequestId || undefined}
        />
      </div>
    </ErrorBoundary>
  );
};

export default Index;
