/**
 * Home page — the primary search interface.
 * Orchestrates the search bar, card grid, filters, modals, comparison,
 * discovery sections, and tabbed results (Cards | Similar | Deck Ideas | Explain).
 * All search state is managed via the `useSearch` hook.
 * @module pages/Index
 */
import {
  lazy,
  Suspense,
  useEffect,
  useCallback,
  useState,
  useMemo,
  useRef,
} from 'react';
const OnboardingWalkthrough = lazy(() =>
  import('@/components/OnboardingWalkthrough').then((m) => ({
    default: m.OnboardingWalkthrough,
  })),
);
import { useOnboarding } from '@/hooks/useOnboarding';
import { UnifiedSearchBar } from '@/components/UnifiedSearchBar';
const EditableQueryBar = lazy(() =>
  import('@/components/EditableQueryBar').then((m) => ({
    default: m.EditableQueryBar,
  })),
);
const SaveSearchButton = lazy(() =>
  import('@/components/SaveSearchButton').then((m) => ({
    default: m.SaveSearchButton,
  })),
);
const ExplainCompilationPanel = lazy(() =>
  import('@/components/ExplainCompilationPanel').then((m) => ({
    default: m.ExplainCompilationPanel,
  })),
);
const ReportIssueDialog = lazy(() =>
  import('@/components/ReportIssueDialog').then((m) => ({
    default: m.ReportIssueDialog,
  })),
);
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
const HomeDiscoverySection = lazy(() =>
  import('@/components/HomeDiscoverySection').then((m) => ({
    default: m.HomeDiscoverySection,
  })),
);
import { ScrollToTop } from '@/components/ScrollToTop';
const SimilarSearches = lazy(() =>
  import('@/components/SimilarSearches').then((m) => ({
    default: m.SimilarSearches,
  })),
);
import { type ViewMode, getStoredViewMode } from '@/lib/view-mode-storage';
import { ResultsTabs, type ResultsTab } from '@/components/ResultsTabs';
import { SeoManager } from '@/components/SeoManager';
const ResultsToolbar = lazy(() =>
  import('@/components/ResultsToolbar').then((m) => ({
    default: m.ResultsToolbar,
  })),
);
const SearchResultsArea = lazy(() =>
  import('@/components/SearchResultsArea').then((m) => ({
    default: m.SearchResultsArea,
  })),
);
const CompareBar = lazy(() =>
  import('@/components/CompareBar').then((m) => ({ default: m.CompareBar })),
);
const CompareModal = lazy(() =>
  import('@/components/CompareModal').then((m) => ({
    default: m.CompareModal,
  })),
);
const PwaInstallBanner = lazy(() =>
  import('@/components/PwaInstallBanner').then((m) => ({
    default: m.PwaInstallBanner,
  })),
);
import { SkipLinks } from '@/components/SkipLinks';

import { useSearch } from '@/hooks/useSearch';
import { useTranslation } from '@/lib/i18n';
import { useCompare } from '@/hooks/useCompare';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useRovingTabIndex } from '@/hooks/useRovingTabIndex';
import { useCollectionLookup } from '@/hooks/useCollection';
import { useAuth } from '@/hooks/useAuth';
import { useSimilarCards } from '@/hooks/useSimilarCards';
import { useDeckIdeas } from '@/hooks/useDeckIdeas';
import { useQuerySuggestions } from '@/hooks/useQuerySuggestions';
const CardModal = lazy(() => import('@/components/CardModal'));

const Index = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const collectionLookup = useCollectionLookup();
  const { isActive: onboardingActive, step: onboardingStep, advance: onboardingAdvance, dismiss: onboardingDismiss } = useOnboarding();
  const searchBarContainerRef = useRef<HTMLDivElement>(null);

  const fillOnboardingExample = useCallback(() => {
    const input = document.getElementById('search-input') as HTMLInputElement | null;
    if (input) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      nativeInputValueSetter?.call(input, 'creatures that make treasure tokens');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, []);

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

  // Results tab state
  const [tabState, setTabState] = useState<{ query: string; tab: ResultsTab }>(
    () => ({
      query: originalQuery,
      tab: 'cards',
    }),
  );
  const activeTab = tabState.query === originalQuery ? tabState.tab : 'cards';

  // Similar cards & deck ideas hooks
  const {
    similarityData,
    isLoading: similarLoading,
    activate: activateSimilar,
  } = useSimilarCards(originalQuery);
  const {
    deckIdea,
    isLoading: deckIdeasLoading,
    isDeckQuery,
    activate: activateDeckIdeas,
  } = useDeckIdeas(originalQuery);

  // "Did you mean?" suggestions when 0 results
  const { suggestions: querySuggestions, isChecking: isCheckingSuggestions } =
    useQuerySuggestions(searchQuery, totalCards, hasSearched && !isSearching);

  const handleTrySuggestion = useCallback(
    (scryfallQuery: string) => {
      handleRerunEditedQuery(scryfallQuery);
    },
    [handleRerunEditedQuery],
  );

  // Activate feature hooks when tab is selected
  const handleTabChange = useCallback(
    (tab: ResultsTab) => {
      if (tab === activeTab) return;
      setTabState({ query: originalQuery, tab });
      if (tab === 'similar') activateSimilar();
      if (tab === 'deck-ideas') activateDeckIdeas();
    },
    [activateSimilar, activateDeckIdeas, activeTab, originalQuery],
  );

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

  const handleToggleCompareMode = useCallback(() => {
    setCompareMode((m) => {
      if (m) clearCompare();
      return !m;
    });
  }, [clearCompare]);

  // Keyboard shortcuts
  const focusSearch = useCallback(() => {
    const input = document.getElementById('search-input');
    input?.focus();
  }, []);
  useKeyboardShortcuts({ onFocusSearch: focusSearch });

  // Art lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const openLightbox = useCallback(
    (index: number) => setLightboxIndex(index),
    [],
  );
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  // Roving tabindex column count based on view mode
  const rovingColumns = useMemo(() => {
    if (viewMode === 'list') return 1;
    if (viewMode === 'images') return 6;
    return 4;
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

  // (parallax removed — static gradient background)

  // Handle hash-based scroll
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const timeout = setTimeout(() => {
      const el = document.getElementById(hash.slice(1));
      el?.scrollIntoView({ behavior: 'smooth' });
    }, 300);
    return () => clearTimeout(timeout);
  }, []);

  const showSimilarTab = hasSearched && !isSearching;
  const showDeckIdeasTab = hasSearched && !isSearching && isDeckQuery;
  const showExplanationTab = hasSearched && !isSearching;

  return (
    <ErrorBoundary>
      <SkipLinks showSearchLink />
      <div className="min-h-screen min-h-[100dvh] flex flex-col relative overflow-x-hidden">
        {/* Static premium gradient background */}
        <div
          className="fixed inset-0 pointer-events-none bg-page-gradient"
          aria-hidden="true"
        />
        <div
          className="fixed inset-0 pointer-events-none bg-page-noise"
          aria-hidden="true"
        />

        <Header />

        {!hasSearched && <HeroSection />}

        {/* SEO manager (renders nothing) */}
        <SeoManager
          hasSearched={hasSearched}
          isSearching={isSearching}
          displayCards={displayCards}
          originalQuery={originalQuery}
          searchQuery={searchQuery}
          compiledQuery={lastSearchResult?.scryfallQuery || searchQuery}
          totalCards={totalCards}
        />

        {/* Screen reader search status announcements */}
        <div
          className="sr-only"
          role="status"
          aria-live="assertive"
          aria-atomic="true"
        >
          {isSearching
            ? t('a11y.searching')
            : hasSearched && totalCards > 0
              ? t('a11y.foundCards').replace(
                  '{count}',
                  totalCards.toLocaleString(),
                )
              : hasSearched && totalCards === 0
                ? t('a11y.noCardsFound')
                : ''}
        </div>

        {/* Main content */}
        <main
          id="main-content"
          className={`relative flex-1 ${hasSearched ? 'pt-4 sm:pt-6' : 'pt-2 sm:pt-3'} pb-4 sm:pb-8 safe-bottom`}
          role="main"
        >
          <div className="container-main space-y-3 sm:space-y-6">
            <div ref={searchBarContainerRef}>
              <UnifiedSearchBar
                ref={searchBarRef}
                onSearch={handleSearch}
                isLoading={isSearching}
                lastTranslatedQuery={lastSearchResult?.scryfallQuery}
                filters={activeFilters}
                isCardFetching={isSearching}
              />
            </div>

            <OnboardingWalkthrough
              isActive={onboardingActive}
              step={onboardingStep}
              onAdvance={onboardingAdvance}
              onDismiss={onboardingDismiss}
              searchBarRef={searchBarContainerRef}
              onFillExample={fillOnboardingExample}
            />

            {hasSearched && (
              <div className="animate-reveal flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <EditableQueryBar
                    scryfallQuery={(
                      lastSearchResult?.scryfallQuery || searchQuery
                    ).trim()}
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
                    scryfallQuery={
                      lastSearchResult?.scryfallQuery || searchQuery
                    }
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

            {/* Results Tabs */}
            {hasSearched && !isSearching && (
              <div className="animate-reveal">
                <ResultsTabs
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  showSimilar={showSimilarTab}
                  showDeckIdeas={showDeckIdeasTab}
                  showExplanation={showExplanationTab}
                  similarLoading={similarLoading}
                  deckIdeasLoading={deckIdeasLoading}
                />
              </div>
            )}

            {/* Toolbar row — only show for Cards tab */}
            {cards.length > 0 && !isSearching && activeTab === 'cards' && (
              <ResultsToolbar
                cards={cards}
                displayCards={displayCards}
                totalCards={totalCards}
                activeFilters={activeFilters}
                filtersResetKey={filtersResetKey}
                initialUrlFilters={initialUrlFilters}
                collectionLookup={user ? collectionLookup : undefined}
                onFilteredCards={handleFilteredCards}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                compareMode={compareMode}
                onToggleCompareMode={handleToggleCompareMode}
              />
            )}

            {/* Similar searches — hidden on mobile */}
            {hasSearched && !isSearching && activeTab === 'cards' && (
              <div className="hidden sm:block">
                <SimilarSearches
                  originalQuery={originalQuery}
                  onSuggestionClick={handleTryExample}
                />
              </div>
            )}
          </div>

          {/* Tab content area */}
          <SearchResultsArea
            activeTab={activeTab}
            cards={cards}
            displayCards={displayCards}
            totalCards={totalCards}
            viewMode={viewMode}
            isSearching={isSearching}
            hasSearched={hasSearched}
            searchQuery={searchQuery}
            originalQuery={originalQuery}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
            handleCardClick={handleCardClick}
            handleTryExample={handleTryExample}
            compareMode={compareMode}
            toggleCompareCard={toggleCompareCard}
            isCardSelected={isCardSelected}
            collectionLookup={collectionLookup}
            loadMoreRef={loadMoreRef}
            getRovingProps={getRovingProps}
            lightboxIndex={lightboxIndex}
            openLightbox={openLightbox}
            closeLightbox={closeLightbox}
            similarityData={similarityData}
            similarLoading={similarLoading}
            deckIdea={deckIdea}
            deckIdeasLoading={deckIdeasLoading}
            querySuggestions={querySuggestions}
            isCheckingSuggestions={isCheckingSuggestions}
            onTrySuggestion={handleTrySuggestion}
          />
        </main>

        {!hasSearched && <HomeDiscoverySection onSearch={handleTryExample} />}

        <Footer />
        <ScrollToTop threshold={800} />

        {selectedCard && (
          <Suspense
            fallback={
              <div className="sr-only" role="status">
                Loading card details…
              </div>
            }
          >
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
