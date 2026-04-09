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
import { useLocation } from 'react-router-dom';
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
const Footer = lazy(() =>
  import('@/components/Footer').then((m) => ({ default: m.Footer })),
);
import { Header } from '@/components/Header';
const HeroSection = lazy(() =>
  import('@/components/HeroSection').then((m) => ({ default: m.HeroSection })),
);
import { HomepageLandingContent } from '@/components/HomepageLandingContent';
import { ScrollToTop } from '@/components/ScrollToTop';
import { type ViewMode, getStoredViewMode } from '@/lib/view-mode-storage';
const ResultsTabs = lazy(() =>
  import('@/components/ResultsTabs').then((m) => ({
    default: m.ResultsTabs,
  })),
);
import type { ResultsTab } from '@/components/ResultsTabs';
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

import {
  useSearch,
  useCompare,
  useKeyboardShortcuts,
  useRovingTabIndex,
  useCollectionLookup,
  useAuth,
  useSimilarCards,
  useDeckIdeas,
  useQuerySuggestions,
  useNoIndex,
  useAnalytics,
} from '@/hooks';
import { useTranslation } from '@/lib/i18n';
const CardModal = lazy(() => import('@/components/CardModal'));

const Index = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const {
    trackLandingPageView,
    trackRouteView,
    trackFirstSave,
    trackFirstReturnVisit,
    trackEvent,
  } = useAnalytics();
  const { user } = useAuth();
  const collectionLookup = useCollectionLookup();
  const lastTrackedRouteRef = useRef<string | null>(null);

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
    lastClickLatencyMs,
    refinementCount,
    struggleCount,
    queryQualityScore,
    queryQualityConfidence,
    queryQualitySampleSize,
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

  // Prevent indexing of zero-result search pages
  useNoIndex(hasSearched && !isSearching && totalCards === 0);

  const handleTrySuggestion = useCallback(
    (scryfallQuery: string) => {
      sessionStorage.setItem('offmeta_recovery_in_progress', '1');
      trackEvent('search_recovery_clicked', {
        query: originalQuery,
        suggestion_query: scryfallQuery,
      });
      handleRerunEditedQuery(scryfallQuery);
    },
    [handleRerunEditedQuery, originalQuery, trackEvent],
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
  const [upsellEvaluationNowMs, setUpsellEvaluationNowMs] = useState(() =>
    Date.now(),
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setUpsellEvaluationNowMs(Date.now());
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hasSearched, isSearching, queryQualityScore]);

  const shouldShowProUpsell = useMemo(() => {
    const readSessionValue = (key: string): string | null => {
      try {
        return sessionStorage.getItem(key);
      } catch {
        return null;
      }
    };
    const readLocalValue = (key: string): string | null => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    };
    const searchesThisSession = parseInt(
      readSessionValue('offmeta_searches_per_session') || '0',
      10,
    );
    const hasSaved = readSessionValue('offmeta_once:first_save') === '1';
    const hasSuccess =
      readSessionValue('offmeta_once:first_search_success') === '1';
    const cooldownUntil = parseInt(
      readLocalValue('offmeta_pro_upsell_cooldown_until') || '0',
      10,
    );
    const inCooldown =
      Number.isFinite(cooldownUntil) && upsellEvaluationNowMs < cooldownUntil;

    return (
      hasSearched &&
      !isSearching &&
      queryQualityScore < 0.55 &&
      searchesThisSession >= 3 &&
      hasSuccess &&
      !hasSaved &&
      !inCooldown
    );
  }, [hasSearched, isSearching, queryQualityScore, upsellEvaluationNowMs]);

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

  useEffect(() => {
    trackFirstReturnVisit();
  }, [trackFirstReturnVisit]);

  useEffect(() => {
    if (!shouldShowProUpsell) return;
    trackEvent('pro_upgrade_impression', {
      query: originalQuery,
      search_quality_score: queryQualityScore,
      placement: 'search_feedback_loop',
    });
    try {
      localStorage.setItem(
        'offmeta_pro_upsell_cooldown_until',
        String(Date.now() + 24 * 60 * 60 * 1000),
      );
    } catch {
      // ignore storage failures; no upsell blocking can be persisted
    }
  }, [originalQuery, queryQualityScore, shouldShowProUpsell, trackEvent]);

  useEffect(() => {
    const routeKey = `${location.pathname}${location.search}${location.hash}`;
    if (lastTrackedRouteRef.current === routeKey) return;
    lastTrackedRouteRef.current = routeKey;

    const routeData = {
      path: location.pathname,
      search: location.search || undefined,
      referrer: document.referrer || undefined,
    };

    trackRouteView(routeData);

    if (location.pathname === '/' && !location.search && !hasSearched) {
      trackLandingPageView(routeData);
    }
  }, [
    hasSearched,
    location.hash,
    location.pathname,
    location.search,
    trackLandingPageView,
    trackRouteView,
  ]);

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
          className={`relative ${hasSearched ? 'pt-4 sm:pt-6' : 'pt-2 sm:pt-3'} pb-4 sm:pb-8 safe-bottom`}
          role="main"
        >
          <div className="container-main space-y-3 sm:space-y-6">
            <div>
              <UnifiedSearchBar
                ref={searchBarRef}
                onSearch={handleSearch}
                isLoading={isSearching}
                lastTranslatedQuery={lastSearchResult?.scryfallQuery}
                filters={activeFilters}
                isCardFetching={isSearching}
              />
            </div>

            {!hasSearched && (
              <p className="text-center text-sm text-muted-foreground animate-reveal">
                Describe your deck need in plain English. Example:{' '}
                <button
                  type="button"
                  onClick={() =>
                    handleTryExample('commander board wipes under $5')
                  }
                  className="underline decoration-dotted underline-offset-4 hover:text-foreground transition-colors"
                >
                  "commander board wipes under $5"
                </button>
              </p>
            )}

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
                    onSaved={() =>
                      trackFirstSave({
                        query: originalQuery,
                        request_id: currentRequestId ?? undefined,
                      })
                    }
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

            {hasSearched && !isSearching && (
              <div className="space-y-2">
                {refinementCount > 0 && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
                    Narrow results like this? Save this refinement as a reusable
                    workflow.
                  </div>
                )}
                {lastClickLatencyMs !== null && lastClickLatencyMs < 1200 && (
                  <button
                    type="button"
                    onClick={() =>
                      setTabState({ query: originalQuery, tab: 'similar' })
                    }
                    className="w-full text-left rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-foreground hover:bg-accent/15 transition-colors"
                  >
                    Fast pick detected ({lastClickLatencyMs}ms). See boosted
                    similar cards →
                  </button>
                )}
                {struggleCount >= 2 && (
                  <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-foreground">
                    Looks like this search is struggling. Try guided suggestions
                    below to recover quickly.
                  </div>
                )}
                <div className="text-[11px] text-muted-foreground">
                  Search quality score: {Math.round(queryQualityScore * 100)}%
                </div>
                {shouldShowProUpsell && (
                  <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-foreground">
                    Better results with Pro: advanced explainability + priority
                    ranking.
                  </div>
                )}
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
            queryQualityScore={queryQualityScore}
            queryConfidence={queryQualityConfidence}
            querySampleSize={queryQualitySampleSize}
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
            onRelatedCardClick={handleTryExample}
          />
        </main>

        {!hasSearched && (
          <HomepageLandingContent onTrySearch={handleTryExample} />
        )}

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
