/**
 * Home page — the primary search interface.
 * Orchestrates the search bar, card grid, filters, modals, comparison,
 * and discovery sections (Daily Pick, Staples, How It Works, FAQ).
 * All search state is managed via the `useSearch` hook.
 * @module pages/Index
 */
import { lazy, Suspense, useEffect, useCallback, useState, useMemo } from 'react';
import { UnifiedSearchBar } from '@/components/UnifiedSearchBar';
import { EditableQueryBar } from '@/components/EditableQueryBar';
import { SaveSearchButton } from '@/components/SaveSearchButton';
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
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { HomeDiscoverySection } from '@/components/HomeDiscoverySection';
import { LoadMoreIndicator } from '@/components/LoadMoreIndicator';
import { ScrollToTop } from '@/components/ScrollToTop';
import { SimilarSearches } from '@/components/SimilarSearches';
import { VirtualizedCardGrid } from '@/components/VirtualizedCardGrid';
import { ExportResults } from '@/components/ExportResults';
import { ViewToggle } from '@/components/ViewToggle';
import { type ViewMode, getStoredViewMode } from '@/lib/view-mode-storage';
import { ResultsStats } from '@/components/ResultsStats';
import { ArtLightbox } from '@/components/ArtLightbox';
import { CompareBar } from '@/components/CompareBar';
import { CompareModal } from '@/components/CompareModal';
import { PwaInstallBanner } from '@/components/PwaInstallBanner';

import { GitCompareArrows } from 'lucide-react';
import { CLIENT_CONFIG } from '@/lib/config';
import { useSearch } from '@/hooks/useSearch';
import { useCompare } from '@/hooks/useCompare';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useRovingTabIndex } from '@/hooks/useRovingTabIndex';
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

  // Roving tabindex column count based on view mode (approximate; CSS breakpoints vary)
  const rovingColumns = useMemo(() => {
    if (viewMode === 'list') return 1;
    if (viewMode === 'images') return 6; // xl:grid-cols-6
    return 4; // lg:grid-cols-4 for standard grid
  }, [viewMode]);

  const rovingActivate = useCallback(
    (index: number) => {
      if (viewMode === 'images') {
        openLightbox(index);
      } else if (displayCards[index]) {
        handleCardClick(displayCards[index], index);
      }
    },
    [viewMode, displayCards, handleCardClick, openLightbox],
  );

  const { getRovingProps } = useRovingTabIndex({
    itemCount: displayCards.length,
    columns: rovingColumns,
    onActivate: rovingActivate,
  });

  // Handle hash-based scroll when navigating from another page
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
      <div className="min-h-screen min-h-[100dvh] flex flex-col bg-background relative overflow-x-hidden">
        {/* Background layers */}
        <div className="fixed inset-0 pointer-events-none bg-page-gradient" aria-hidden="true" />
        <div className="fixed inset-0 pointer-events-none bg-page-noise" aria-hidden="true" />
        <div className="fixed inset-0 pointer-events-none bg-page-mesh" aria-hidden="true" />

        {/* Skip links */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <a href="#search-input" className="skip-link" onClick={(e) => {
          e.preventDefault();
          document.getElementById('search-input')?.focus();
        }}>
          Skip to search
        </a>

        <Header />

        {!hasSearched && <HeroSection />}

        {/* Screen reader search status announcements */}
        <div className="sr-only" role="status" aria-live="assertive" aria-atomic="true">
          {isSearching
            ? 'Searching for cards…'
            : hasSearched && totalCards > 0
              ? `Found ${totalCards.toLocaleString()} cards`
              : hasSearched && totalCards === 0
                ? 'No cards found'
                : ''}
        </div>

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
              <div className="animate-reveal flex items-start gap-2">
                <div className="flex-1 min-w-0">
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
                <div className="pt-[26px]">
                  <SaveSearchButton
                    naturalQuery={originalQuery}
                    scryfallQuery={lastSearchResult?.scryfallQuery || searchQuery}
                    filters={activeFilters}
                  />
                </div>
              </div>
            )}

            {/* Explain panel — hidden on mobile */}
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
                      {displayCards.map((card, index) => {
                        const rovingProps = getRovingProps(index);
                        return (
                          <div
                            key={card.id}
                            className="animate-reveal"
                            role="listitem"
                            style={{ animationDelay: `${Math.min(index * 15, 200)}ms` }}
                            ref={rovingProps.ref}
                            onKeyDown={rovingProps.onKeyDown}
                            onFocus={rovingProps.onFocus}
                          >
                            <CardListItem
                              card={card}
                              onClick={() => handleCardClick(card, index)}
                              tabIndex={rovingProps.tabIndex}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : viewMode === 'images' ? (
                    <div
                      className="grid grid-cols-2 min-[480px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3"
                      role="list"
                      aria-label="Search results"
                      data-testid="images-view"
                    >
                      {displayCards.map((card, index) => {
                        const rovingProps = getRovingProps(index);
                        return (
                          <div
                            key={card.id}
                            className="animate-reveal"
                            role="listitem"
                            style={{ animationDelay: `${Math.min(index * 15, 200)}ms` }}
                            ref={rovingProps.ref}
                            onKeyDown={rovingProps.onKeyDown}
                            onFocus={rovingProps.onFocus}
                          >
                            <CardImageItem
                              card={card}
                              onClick={() => openLightbox(index)}
                              tabIndex={rovingProps.tabIndex}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div
                      className="grid grid-cols-2 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 content-visibility-auto"
                      role="list"
                      aria-label="Search results"
                      data-testid="standard-grid"
                    >
                      {displayCards.map((card, index) => {
                        const rovingProps = getRovingProps(index);
                        return (
                          <div
                            key={card.id}
                            className={`animate-reveal relative ${compareMode ? '' : 'contain-layout'}`}
                            role="listitem"
                            style={{
                              animationDelay: `${Math.min(index * 25, 300)}ms`,
                              ...(compareMode ? {} : { contentVisibility: 'auto', containIntrinsicSize: '0 200px' }),
                            }}
                            ref={rovingProps.ref}
                            onKeyDown={rovingProps.onKeyDown}
                            onFocus={rovingProps.onFocus}
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
                                tabIndex={-1}
                              >
                                {isCardSelected(card.id) ? '✓' : '+'}
                              </button>
                            )}
                            <CardItem
                              card={card}
                              onClick={() => compareMode ? toggleCompareCard(card) : handleCardClick(card, index)}
                              tabIndex={rovingProps.tabIndex}
                            />
                          </div>
                        );
                      })}
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

                <LoadMoreIndicator
                  ref={displayCards.length <= CLIENT_CONFIG.VIRTUALIZATION_THRESHOLD ? loadMoreRef : undefined}
                  isFetchingNextPage={isFetchingNextPage}
                  hasNextPage={hasNextPage}
                  totalCards={totalCards}
                  showEndMessage={cards.length > 0}
                />
              </>
            ) : isSearching ? (
              <CardSkeletonGrid count={10} />
            ) : hasSearched && totalCards === 0 ? (
              <EmptyState query={searchQuery} onTryExample={handleTryExample} />
            ) : null}
          </div>
        </main>

        {!hasSearched && <HomeDiscoverySection onSearch={handleTryExample} />}

        <Footer />
        <ScrollToTop threshold={800} />

        {selectedCard && (
          <Suspense fallback={<div className="sr-only" role="status">Loading card details…</div>}>
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

        <PwaInstallBanner />
      </div>
    </ErrorBoundary>
  );
};

export default Index;
