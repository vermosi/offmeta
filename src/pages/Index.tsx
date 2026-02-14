import { lazy, Suspense, useEffect, useRef, useCallback, useState } from 'react';
import { DailyPick } from '@/components/DailyPick';
import { UnifiedSearchBar } from '@/components/UnifiedSearchBar';
import { EditableQueryBar } from '@/components/EditableQueryBar';
import { ExplainCompilationPanel } from '@/components/ExplainCompilationPanel';
import { ReportIssueDialog } from '@/components/ReportIssueDialog';
import { SearchFilters } from '@/components/SearchFilters';
import { CardItem } from '@/components/CardItem';
import { CardListItem } from '@/components/CardListItem';
import { CardImageItem } from '@/components/CardImageItem';
import { CardSkeletonGrid } from '@/components/CardSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Footer } from '@/components/Footer';
import { FAQSection } from '@/components/FAQSection';
import { HowItWorksSection } from '@/components/HowItWorksSection';
import { Header } from '@/components/Header';
import { ScrollToTop } from '@/components/ScrollToTop';
import { SimilarSearches } from '@/components/SimilarSearches';
import { VirtualizedCardGrid } from '@/components/VirtualizedCardGrid';
import { RandomCardButton } from '@/components/RandomCardButton';
import { ExportResults } from '@/components/ExportResults';
import { ViewToggle, getStoredViewMode } from '@/components/ViewToggle';
import type { ViewMode } from '@/components/ViewToggle';
import { Loader2 } from 'lucide-react';
import { CLIENT_CONFIG } from '@/lib/config';
import { useSearch } from '@/hooks/useSearch';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

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
    initialUrlFilters,
  } = useSearch();

  // View mode toggle
  const [viewMode, setViewMode] = useState<ViewMode>(getStoredViewMode);

  // Keyboard shortcuts
  const focusSearch = useCallback(() => {
    const input = document.getElementById('search-input');
    input?.focus();
  }, []);
  useKeyboardShortcuts({ onFocusSearch: focusSearch });

  // Parallax scroll effect for glow orbs
  const heroRef = useRef<HTMLElement>(null);
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        if (orb1Ref.current) {
          orb1Ref.current.style.transform = `translate(${scrollY * 0.02}px, ${scrollY * 0.05}px)`;
        }
        if (orb2Ref.current) {
          orb2Ref.current.style.transform = `translate(${-scrollY * 0.03}px, ${scrollY * 0.04}px)`;
        }
        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <ErrorBoundary>
      <div className="min-h-screen min-h-[100dvh] flex flex-col bg-background relative">
        {/* Full-page gradient background */}
        <div
          className="fixed inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% -20%, hsl(var(--gradient-start) / 0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 60%, hsl(var(--gradient-end) / 0.08) 0%, transparent 50%), radial-gradient(ellipse 50% 30% at 20% 80%, hsl(var(--gradient-start) / 0.06) 0%, transparent 50%)',
            zIndex: 0,
          }}
        />
        {/* Noise texture overlay */}
        <div
          className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.04]"
          aria-hidden="true"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
            backgroundRepeat: 'repeat',
            backgroundSize: '256px 256px',
            zIndex: 0,
          }}
        />
        {/* Mesh grid texture */}
        <div
          className="fixed inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage: 'linear-gradient(hsl(var(--border) / 0.04) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.04) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            zIndex: 0,
          }}
        />

        {/* Skip link */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <Header />

        {/* Hero Section */}
        {!hasSearched && (
          <section
            ref={heroRef}
            className="relative pt-8 sm:pt-14 lg:pt-20 pb-6 sm:pb-10"
            aria-labelledby="hero-heading"
          >

            <div className="container-main text-center stagger-children relative z-10">
              <h1
                id="hero-heading"
                className="mb-5 sm:mb-8 text-foreground text-4xl sm:text-5xl lg:text-7xl font-semibold"
              >
                Find Magic Cards
                <br />
                <span className="text-gradient">Like You Think</span>
              </h1>

              <div className="space-y-1 sm:space-y-2 mb-6 sm:mb-8">
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

              <div className="flex justify-center">
                <RandomCardButton />
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
          <div className="container-main space-y-3 sm:space-y-6">
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

            {/* Explain panel — hidden on mobile to reduce clutter */}
            {hasSearched && (
              <div className="hidden sm:block animate-reveal">
                <ExplainCompilationPanel
                  intent={lastSearchResult?.intent || lastIntent}
                />
              </div>
            )}

            {cards.length > 0 && !isSearching && (
              <div className="flex items-center gap-1.5 sm:gap-2 animate-reveal overflow-x-auto scrollbar-thin pb-0.5">
                <SearchFilters
                  cards={cards}
                  onFilteredCards={handleFilteredCards}
                  totalCards={totalCards}
                  resetKey={filtersResetKey}
                  initialFilters={initialUrlFilters}
                />
                <ViewToggle value={viewMode} onChange={setViewMode} />
                {totalCards > 0 && (
                  <span
                    className="text-[11px] sm:text-xs text-muted-foreground tabular-nums flex-shrink-0"
                    role="status"
                    aria-live="polite"
                  >
                    {totalCards.toLocaleString()}
                  </span>
                )}
                <ExportResults cards={displayCards} />
              </div>
            )}

            {/* Similar searches — hidden on mobile */}
            {hasSearched && !isSearching && (
              <div className="hidden sm:block">
                <SimilarSearches
                  originalQuery={originalQuery}
                  onSuggestionClick={handleTryExample}
                />
              </div>
            )}
          </div>

          {/* Card grid */}
          <div className="mt-3 sm:mt-6 container-main">
            {cards.length > 0 ? (
              <>
                {displayCards.length > 0 ? (
                  viewMode === 'grid' && displayCards.length > CLIENT_CONFIG.VIRTUALIZATION_THRESHOLD ? (
                    <VirtualizedCardGrid
                      cards={displayCards}
                      onCardClick={handleCardClick}
                      onLoadMore={
                        hasNextPage && !isFetchingNextPage ? fetchNextPage : undefined
                      }
                      hasNextPage={hasNextPage}
                      isFetchingNextPage={isFetchingNextPage}
                    />
                  ) : viewMode === 'list' ? (
                    <div
                      className="flex flex-col gap-1.5"
                      role="list"
                      aria-label="Search results"
                      data-testid="list-view"
                    >
                      {displayCards.map((card, index) => (
                        <div
                          key={card.id}
                          className="animate-reveal"
                          role="listitem"
                          style={{ animationDelay: `${Math.min(index * 15, 200)}ms` }}
                        >
                          <CardListItem
                            card={card}
                            onClick={() => handleCardClick(card, index)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : viewMode === 'images' ? (
                    <div
                      className="grid grid-cols-2 min-[480px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3"
                      role="list"
                      aria-label="Search results"
                      data-testid="images-view"
                    >
                      {displayCards.map((card, index) => (
                        <div
                          key={card.id}
                          className="animate-reveal"
                          role="listitem"
                          style={{ animationDelay: `${Math.min(index * 15, 200)}ms` }}
                        >
                          <CardImageItem
                            card={card}
                            onClick={() => handleCardClick(card, index)}
                          />
                        </div>
                      ))}
                    </div>
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
            <div id="daily-pick" className="container-main mt-6 sm:mt-10">
              <DailyPick />
            </div>
            <div id="how-it-works">
              <HowItWorksSection />
            </div>
            <div id="faq">
              <FAQSection />
            </div>
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
