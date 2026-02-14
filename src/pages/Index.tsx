import { lazy, Suspense } from 'react';
import { DailyPick } from '@/components/DailyPick';
import { Link } from 'react-router-dom';
import { UnifiedSearchBar } from '@/components/UnifiedSearchBar';
import { EditableQueryBar } from '@/components/EditableQueryBar';
import { ExplainCompilationPanel } from '@/components/ExplainCompilationPanel';
import { ReportIssueDialog } from '@/components/ReportIssueDialog';
import { SearchFilters } from '@/components/SearchFilters';
import { CardItem } from '@/components/CardItem';
import { CardSkeletonGrid } from '@/components/CardSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Footer } from '@/components/Footer';
import { FAQSection } from '@/components/FAQSection';
import { HowItWorksSection } from '@/components/HowItWorksSection';
import { ScrollToTop } from '@/components/ScrollToTop';
import { SimilarSearches } from '@/components/SimilarSearches';
import { ThemeToggle } from '@/components/ThemeToggle';
import { VirtualizedCardGrid } from '@/components/VirtualizedCardGrid';
import { Loader2 } from 'lucide-react';
import { CLIENT_CONFIG } from '@/lib/config';
import { useSearch } from '@/hooks/useSearch';

const CardModal = lazy(() => import('@/components/CardModal'));

const Index = () => {
  const {
    searchQuery,
    originalQuery,
    selectedCard,
    setSelectedCard,
    hasSearched,
    lastSearchResult,
    lastIntent,
    activeFilters,
    filtersResetKey,
    reportDialogOpen,
    setReportDialogOpen,
    currentRequestId,
    cards,
    displayCards,
    totalCards,
    isSearching,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    searchBarRef,
    loadMoreRef,
    handleSearch,
    handleRerunEditedQuery,
    handleCardClick,
    handleTryExample,
    handleRegenerateTranslation,
    handleFilteredCards,
  } = useSearch();

  return (
    <ErrorBoundary>
      <div className="min-h-screen min-h-[100dvh] flex flex-col bg-background">
        {/* Skip link */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {/* Header */}
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
                  <linearGradient
                    id="logoGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="hsl(300, 90%, 60%)" />
                    <stop offset="100%" stopColor="hsl(195, 95%, 55%)" />
                  </linearGradient>
                </defs>
                <path
                  d="M16 2L30 16L16 30L2 16L16 2Z"
                  fill="url(#logoGradient)"
                  opacity="0.15"
                />
                <path
                  d="M16 2L30 16L16 30L2 16L16 2Z"
                  stroke="url(#logoGradient)"
                  strokeWidth="1.5"
                  fill="none"
                />
                <path
                  d="M8 16C8 16 11 11 16 11C21 11 24 16 24 16C24 16 21 21 16 21C11 21 8 16 8 16Z"
                  stroke="url(#logoGradient)"
                  strokeWidth="1.25"
                  fill="none"
                />
                <circle cx="16" cy="16" r="2" fill="url(#logoGradient)" />
              </svg>
              <span className="text-lg font-semibold tracking-tight">
                OffMeta
              </span>
            </Link>
            <ThemeToggle />
          </div>
        </header>

        {/* Hero Section */}
        {!hasSearched && (
          <section
            className="relative pt-12 sm:pt-20 lg:pt-28 pb-6 sm:pb-12 overflow-hidden"
            aria-labelledby="hero-heading"
          >
            <div
              className="glow-orb absolute -top-32 -left-32 sm:-top-48 sm:-left-48"
              aria-hidden="true"
            />
            <div
              className="glow-orb glow-orb-secondary absolute -bottom-32 -right-32 sm:-bottom-48 sm:-right-48"
              aria-hidden="true"
            />

            <div className="container-main text-center stagger-children relative z-10">
              <h1
                id="hero-heading"
                className="mb-5 sm:mb-8 text-foreground text-4xl sm:text-5xl lg:text-7xl font-semibold"
              >
                Find Magic Cards
                <br />
                <span className="text-gradient">Like You Think</span>
              </h1>

              <div className="space-y-1 sm:space-y-2 mb-10 sm:mb-14">
                <p className="text-base sm:text-lg lg:text-xl text-muted-foreground">
                  Describe what you're looking for in plain English.
                </p>
                <p className="text-base sm:text-lg lg:text-xl text-muted-foreground">
                  No complex syntax. No guessing.
                </p>
                <p className="text-base sm:text-lg lg:text-xl text-foreground font-medium mt-3">
                  Just natural conversation.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Main content */}
        <main
          id="main-content"
          className={`relative flex-1 ${hasSearched ? 'pt-4 sm:pt-6' : ''} pb-8 sm:pb-16 safe-bottom`}
          role="main"
        >
          <div className="container-main space-y-6 sm:space-y-8">
            <UnifiedSearchBar
              ref={searchBarRef}
              onSearch={handleSearch}
              isLoading={isSearching}
              lastTranslatedQuery={lastSearchResult?.scryfallQuery}
              filters={activeFilters}
            />

            {hasSearched && (
              <div className="animate-reveal">
                <EditableQueryBar
                  scryfallQuery={(lastSearchResult?.scryfallQuery || searchQuery).trim()}
                  confidence={lastSearchResult?.explanation?.confidence}
                  isLoading={isSearching}
                  originalQuery={originalQuery}
                  onRerun={handleRerunEditedQuery}
                  onRegenerate={handleRegenerateTranslation}
                  onReportIssue={() => setReportDialogOpen(true)}
                  validationError={
                    lastSearchResult?.validationIssues?.length
                      ? lastSearchResult.validationIssues.join(' • ')
                      : null
                  }
                />
              </div>
            )}

            {hasSearched && (
              <div className="animate-reveal">
                <ExplainCompilationPanel
                  intent={lastSearchResult?.intent || lastIntent}
                />
              </div>
            )}

            {hasSearched && !isSearching && (
              <div className="animate-reveal">
                <SimilarSearches
                  originalQuery={originalQuery}
                  onSuggestionClick={handleTryExample}
                />
              </div>
            )}

            {cards.length > 0 && !isSearching && (
              <div className="flex flex-wrap items-center justify-center gap-3 animate-reveal">
                <SearchFilters
                  cards={cards}
                  onFilteredCards={handleFilteredCards}
                  totalCards={totalCards}
                  resetKey={filtersResetKey}
                />
                {totalCards > 0 && (
                  <span
                    className="text-xs text-muted-foreground"
                    role="status"
                    aria-live="polite"
                  >
                    {totalCards.toLocaleString()} cards
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Card grid */}
          <div className="mt-6 sm:mt-8 px-4 sm:px-6 lg:px-8">
            {cards.length > 0 ? (
              <>
                {displayCards.length > 0 ? (
                  displayCards.length > CLIENT_CONFIG.VIRTUALIZATION_THRESHOLD ? (
                    <VirtualizedCardGrid
                      cards={displayCards}
                      onCardClick={handleCardClick}
                      onLoadMore={
                        hasNextPage && !isFetchingNextPage ? fetchNextPage : undefined
                      }
                      hasNextPage={hasNextPage}
                      isFetchingNextPage={isFetchingNextPage}
                    />
                  ) : (
                    <div
                      className="grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 content-visibility-auto justify-items-center"
                      role="list"
                      aria-label="Search results"
                      data-testid="standard-grid"
                    >
                      {displayCards.map((card, index) => (
                        <div
                          key={card.id}
                          className="animate-reveal contain-layout"
                          role="listitem"
                          style={{
                            animationDelay: `${Math.min(index * 25, 300)}ms`,
                            contentVisibility: 'auto',
                            containIntrinsicSize: '0 200px',
                          }}
                        >
                          <CardItem
                            card={card}
                            onClick={() => handleCardClick(card, index)}
                          />
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      No cards match your filters.
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Try adjusting your filter criteria.
                    </p>
                  </div>
                )}

                {displayCards.length <= CLIENT_CONFIG.VIRTUALIZATION_THRESHOLD && (
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
                )}

                {displayCards.length > CLIENT_CONFIG.VIRTUALIZATION_THRESHOLD && (
                  <div className="flex justify-center pt-4 pb-4">
                    {isFetchingNextPage && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading more cards...</span>
                      </div>
                    )}
                    {!hasNextPage && cards.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {totalCards.toLocaleString()} cards total
                      </span>
                    )}
                  </div>
                )}
              </>
            ) : isSearching ? (
              <CardSkeletonGrid count={10} />
            ) : hasSearched && totalCards === 0 ? (
              <EmptyState query={searchQuery} onTryExample={handleTryExample} />
            ) : null}
          </div>
        </main>

        {!hasSearched && (
          <>
            <div className="container-main mt-6 sm:mt-10">
              <DailyPick />
            </div>
            <HowItWorksSection />
            <FAQSection />
          </>
        )}

        <Footer />
        <ScrollToTop threshold={800} />

        {selectedCard && (
          <Suspense fallback={null}>
            <CardModal
              card={selectedCard}
              open={true}
              onClose={() => setSelectedCard(null)}
            />
          </Suspense>
        )}

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
