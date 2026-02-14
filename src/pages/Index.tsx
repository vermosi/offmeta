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
import { ResultsStats } from '@/components/ResultsStats';
import { ArtLightbox } from '@/components/ArtLightbox';
import { CompareBar } from '@/components/CompareBar';
import { CompareModal } from '@/components/CompareModal';
import { PwaInstallBanner } from '@/components/PwaInstallBanner';
import { StaplesSection } from '@/components/StaplesSection';
import type { ViewMode } from '@/components/ViewToggle';
import { Loader2, GitCompareArrows } from 'lucide-react';
import { CLIENT_CONFIG } from '@/lib/config';
import { useSearch } from '@/hooks/useSearch';
import { useCompare } from '@/hooks/useCompare';
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

  // Card comparison
  const {
    compareCards,
    compareOpen,
    toggleCompareCard,
    removeCompareCard,
    clearCompare,
    openCompare,
    closeCompare,
    isCardSelected,
  } = useCompare();
  const [compareMode, setCompareMode] = useState(false);

  // Keyboard shortcuts
  const focusSearch = useCallback(() => {
    const input = document.getElementById('search-input');
    input?.focus();
  }, []);
  useKeyboardShortcuts({ onFocusSearch: focusSearch });

  // Art lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const openLightbox = useCallback((index: number) => setLightboxIndex(index), []);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

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

  // Handle hash-based scroll when navigating from another page (e.g. #daily-pick)
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const timeout = setTimeout(() => {
      const el = document.getElementById(hash.slice(1));
      el?.scrollIntoView({ behavior: 'smooth' });
    }, 300);
    return () => clearTimeout(timeout);
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
              <div className="animate-reveal space-y-2">
                {/* Toolbar row */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <SearchFilters
                    cards={cards}
                    onFilteredCards={handleFilteredCards}
                    totalCards={totalCards}
                    resetKey={filtersResetKey}
                    initialFilters={initialUrlFilters}
                  />
                  <ViewToggle value={viewMode} onChange={setViewMode} />

                  {/* Compare mode toggle */}
                  <button
                    onClick={() => {
                      setCompareMode((m) => !m);
                      if (compareMode) clearCompare();
                    }}
                    className={`hidden sm:flex items-center gap-1 py-1 px-2.5 text-xs rounded-md transition-colors ${
                      compareMode
                        ? 'bg-primary/10 text-primary border border-primary/30'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                    aria-pressed={compareMode}
                  >
                    <GitCompareArrows className="h-3.5 w-3.5" />
                    <span>Compare</span>
                  </button>

                  <div className="flex-1" />

                  {totalCards > 0 && (
                    <span
                      className="text-[11px] sm:text-xs text-muted-foreground tabular-nums flex-shrink-0"
                      role="status"
                      aria-live="polite"
                    >
                      {totalCards.toLocaleString()} cards
                    </span>
                  )}
                  <ExportResults cards={displayCards} />
                  <ResultsStats cards={displayCards} />
                </div>
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
                            onClick={() => openLightbox(index)}
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
                          className={`animate-reveal relative ${compareMode ? '' : 'contain-layout'}`}
                          role="listitem"
                          style={{
                            animationDelay: `${Math.min(index * 25, 300)}ms`,
                            ...(compareMode ? {} : { contentVisibility: 'auto', containIntrinsicSize: '0 200px' }),
                          }}
                        >
                          {compareMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCompareCard(card);
                              }}
                              className={`absolute top-2 left-2 z-10 h-6 w-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                                isCardSelected(card.id)
                                  ? 'bg-primary border-primary text-primary-foreground'
                                  : 'bg-card/80 border-border/60 text-muted-foreground hover:border-primary/50'
                              }`}
                              aria-label={`${isCardSelected(card.id) ? 'Remove from' : 'Add to'} comparison`}
                            >
                              {isCardSelected(card.id) ? '✓' : '+'}
                            </button>
                          )}
                          <CardItem
                            card={card}
                            onClick={() => compareMode ? toggleCompareCard(card) : handleCardClick(card, index)}
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
            <div className="container-main mt-6 sm:mt-10">
              <StaplesSection onSearch={handleTryExample} />
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

        {lightboxIndex !== null && displayCards.length > 0 && (
          <ArtLightbox
            cards={displayCards}
            initialIndex={lightboxIndex}
            onClose={closeLightbox}
          />
        )}

        <ReportIssueDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          originalQuery={originalQuery}
          compiledQuery={lastSearchResult?.scryfallQuery || searchQuery}
          filters={activeFilters}
          requestId={currentRequestId || undefined}
        />

        {/* Compare bar + modal */}
        <CompareBar
          cards={compareCards}
          onRemove={removeCompareCard}
          onClear={clearCompare}
          onCompare={openCompare}
        />
        <CompareModal
          cards={compareCards}
          open={compareOpen}
          onClose={closeCompare}
        />

        {/* PWA install prompt */}
        <PwaInstallBanner />
      </div>
    </ErrorBoundary>
  );
};

export default Index;
