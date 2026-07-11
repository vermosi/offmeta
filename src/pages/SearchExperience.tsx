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
import { Badge } from '@/components/ui/badge';
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
import { HeroSection } from '@/components/HeroSection';
const InstantDemoPreview = lazy(() =>
  import('@/components/InstantDemoPreview').then((m) => ({
    default: m.InstantDemoPreview,
  })),
);
const ValuePropStrip = lazy(() =>
  import('@/components/ValuePropStrip').then((m) => ({
    default: m.ValuePropStrip,
  })),
);
const HowItWorksSection = lazy(() =>
  import('@/components/HowItWorksSection').then((m) => ({
    default: m.HowItWorksSection,
  })),
);
const StickySearchNudge = lazy(() =>
  import('@/components/StickySearchNudge').then((m) => ({
    default: m.StickySearchNudge,
  })),
);
const ScrollToTop = lazy(() =>
  import('@/components/ScrollToTop').then((m) => ({ default: m.ScrollToTop })),
);
import { type ViewMode, getStoredViewMode } from '@/lib/view-mode-storage';
const ResultsTabs = lazy(() =>
  import('@/components/ResultsTabs').then((m) => ({
    default: m.ResultsTabs,
  })),
);
import type { ResultsTab } from '@/components/ResultsTabs';
const SeoManager = lazy(() =>
  import('@/components/SeoManager').then((m) => ({ default: m.SeoManager })),
);
const ResultsToolbar = lazy(() =>
  import('@/components/ResultsToolbar').then((m) => ({
    default: m.ResultsToolbar,
  })),
);
const SearchNextActions = lazy(() =>
  import('@/components/SearchNextActions').then((m) => ({
    default: m.SearchNextActions,
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
import { SkipLinks } from '@/components/SkipLinks';

import { useAnalytics } from '@/hooks/useAnalytics';
import { useAuth } from '@/hooks/useAuth';
import { useCollectionLookup } from '@/hooks/useCollection';
import { useCompare } from '@/hooks/useCompare';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useRovingTabIndex } from '@/hooks/useRovingTabIndex';
import { useSearch } from '@/hooks/useSearch';
import { useSearchRenderProfiler } from '@/hooks/useSearchRenderProfiler';
import { useTranslation } from '@/lib/i18n';
const CardModal = lazy(() => import('@/components/CardModal'));

const IS_TEST_MODE = import.meta.env.MODE === 'test';

const Index = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const {
    trackLandingPageView,
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
    pendingFilterOverride,
    filterOverrideKey,
    applyFilterPatch,
    clearAllFilters,
    reportDialogOpen,
    setReportDialogOpen,
    currentRequestId,
    refinementCount,
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

  // Profile the render side of the search flow. No-op unless
  // `localStorage.offmeta_profile_search === '1'` (auto-on in dev).
  useSearchRenderProfiler({
    scryfallQuery: lastSearchResult?.scryfallQuery ?? searchQuery,
    cardCount: cards.length,
    isSearching,
  });

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
  const showSimilarTab = hasSearched && !isSearching;
  const isDeckQuery =
    /\b(deck|build|commander|strategy|brew|edh)\b/i.test(originalQuery);
  const showDeckIdeasTab =
    hasSearched && !isSearching && isDeckQuery;
  const showExplanationTab = hasSearched && !isSearching;

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

  const handleTabChange = useCallback(
    (tab: ResultsTab) => {
      if (tab === activeTab) return;
      setTabState({ query: originalQuery, tab });
    },
    [activeTab, originalQuery],
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

  // Preload search-result chunks after idle or on first user interaction
  // with the search input. Keeps initial paint lean while ensuring results
  // render instantly when the user submits.
  useEffect(() => {
    if (IS_TEST_MODE) return undefined;

    let done = false;
    const prefetch = () => {
      if (done) return;
      done = true;
      void import('@/components/SearchResultsArea');
      void import('@/components/ResultsTabs');
      void import('@/components/ResultsToolbar');
      void import('@/components/EditableQueryBar');
      void import('@/components/CardModal');
    };
    const w = window as Window & {
      requestIdleCallback?: (
        cb: () => void,
        opts?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const idleId =
      typeof w.requestIdleCallback === 'function'
        ? w.requestIdleCallback(prefetch, { timeout: 3000 })
        : window.setTimeout(prefetch, 2000);
    const onInteract = () => prefetch();
    const input = document.getElementById('search-input');
    input?.addEventListener('focus', onInteract, { once: true });
    input?.addEventListener('pointerdown', onInteract, { once: true });
    return () => {
      if (
        typeof w.cancelIdleCallback === 'function' &&
        typeof idleId === 'number'
      ) {
        w.cancelIdleCallback(idleId);
      } else {
        window.clearTimeout(idleId as number);
      }
      input?.removeEventListener('focus', onInteract);
      input?.removeEventListener('pointerdown', onInteract);
    };
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

    if (location.pathname === '/' && !location.search && !hasSearched) {
      trackLandingPageView({
        path: location.pathname,
        search: location.search || undefined,
        referrer: document.referrer || undefined,
      });
    }
  }, [
    hasSearched,
    location.hash,
    location.pathname,
    location.search,
    trackLandingPageView,
  ]);

  const showResultsMode = hasSearched || isSearching;
  const translationSource = lastSearchResult?.source ?? 'ai';
  const translationConfidence = lastSearchResult?.explanation?.confidence;
  const translationSourceLabel =
    translationSource === 'deterministic'
      ? 'Deterministic'
      : translationSource === 'cache'
        ? 'Cached'
        : translationSource === 'client_recovery'
          ? 'Recovered'
          : translationSource === 'concept_match'
            ? 'Concept match'
            : translationSource === 'budget_fallback'
              ? 'Fallback'
              : 'AI';

  return (
    <ErrorBoundary>
      <SkipLinks showSearchLink />
      <div className="min-h-screen min-h-[100dvh] flex flex-col relative overflow-x-hidden">
        {/* Shared page background stack — gradient wash, ambient glow, noise.
            Kept fixed so the hero and every section below share the same
            atmosphere instead of the hero's glow ending at its bottom edge. */}
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

        {/* Floating particles — hero area */}
        <Suspense fallback={null}>
          <SeoManager
            hasSearched={hasSearched}
            isSearching={isSearching}
            displayCards={displayCards}
            originalQuery={originalQuery}
            searchQuery={searchQuery}
            compiledQuery={lastSearchResult?.scryfallQuery || searchQuery}
            totalCards={totalCards}
          />
        </Suspense>

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
            {showResultsMode && (
              <div className="sticky top-16 z-20 -mx-3 sm:-mx-4 lg:-mx-6 px-3 sm:px-4 lg:px-6">
                <div className="animate-reveal rounded-2xl border border-border/70 bg-card/85 backdrop-blur-xl shadow-lg shadow-black/5 px-3 py-2 sm:px-4 sm:py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          {t('results.summaryTitle', 'Search results')}
                        </span>
                        {hasSearched && totalCards > 0 && (
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {t('results.summaryCards', '{count} cards').replace('{count}', totalCards.toLocaleString())}
                          </span>
                        )}
                        {isSearching && (
                          <span className="text-xs text-muted-foreground">
                            {t('results.updating', 'Updating results')}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-sm font-medium text-foreground">
                        {originalQuery || searchQuery || t('search.placeholder')}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href="#search-results"
                        className="inline-flex items-center justify-center rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-background"
                      >
                        {t('results.jumpToResults', 'Jump to results')}
                      </a>
                      {hasSearched && (
                        <a
                          href="#main-content"
                          className="inline-flex items-center justify-center rounded-full border border-transparent px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {t('results.backToSearch', 'Back to search')}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

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
              <Suspense fallback={null}>
                <InstantDemoPreview onTrySearch={handleTryExample} />
              </Suspense>
            )}

            {showResultsMode && (
              <div className="animate-reveal flex items-start gap-2">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                      {t('search.resultsFor', 'Results for "{query}"').replace(
                        '{query}',
                        originalQuery || searchQuery || '',
                      )}
                      {hasSearched && totalCards > 0 && (
                        <span className="text-muted-foreground font-normal ml-1.5">
                          ({t('results.summaryCards', '{count} cards').replace('{count}', totalCards.toLocaleString())})
                        </span>
                      )}
                    </h1>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                        {translationSourceLabel}
                      </Badge>
                      {typeof translationConfidence === 'number' && (
                        <Badge variant="outline" className="text-[10px] tabular-nums">
                          {Math.round(translationConfidence * 100)}%
                        </Badge>
                      )}
                    </div>
                  </div>
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
                />
              </div>
            )}

            {hasSearched && !isSearching && (
              <div className="space-y-2">
                {refinementCount > 0 && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
                    {t(
                      'results.refinementHint',
                      'Narrow results like this? Save this refinement as a reusable workflow.',
                    )}
                  </div>
                )}
                {shouldShowProUpsell && (
                  <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-foreground">
                    {t(
                      'results.proUpsell',
                      'Better results with Pro: advanced explainability + priority ranking.',
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Toolbar row — only show for Cards tab */}
            {hasSearched && !isSearching && totalCards > 0 && (
              <Suspense fallback={null}>
                <SearchNextActions
                  intent={lastSearchResult?.intent || lastIntent}
                  originalQuery={originalQuery}
                  totalCards={totalCards}
                  isDeckQuery={isDeckQuery}
                  queryQualityScore={queryQualityScore}
                />
              </Suspense>
            )}

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
                pendingFilterOverride={pendingFilterOverride}
                filterOverrideKey={filterOverrideKey}
              />

            )}
          </div>

          {/* Tab content area */}
          {hasSearched && (
            <Suspense fallback={null}>
              <SearchResultsArea
                id="search-results"
                activeSort={activeFilters?.sortBy}
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
                onTrySuggestion={handleTrySuggestion}
                onRelatedCardClick={handleTryExample}
                activeFilters={activeFilters}
                onApplyFilterPatch={applyFilterPatch}
                onClearAllFilters={clearAllFilters}
              />
            </Suspense>

          )}
        </main>

        {!hasSearched && (
          <div className="container-main" aria-hidden="true">
            <div className="section-divider" />
          </div>
        )}
        {!hasSearched && (
          <Suspense fallback={null}>
            <HowItWorksSection />
          </Suspense>
        )}
        {!hasSearched && (
          <div className="container-main" aria-hidden="true">
            <div className="section-divider" />
          </div>
        )}
        {!hasSearched && (
          <Suspense fallback={null}>
            <ValuePropStrip />
          </Suspense>
        )}

        <Suspense fallback={null}>
          <Footer />
        </Suspense>

        <Suspense fallback={null}>
          <StickySearchNudge
            hasSearched={hasSearched}
            onTrySearch={handleTryExample}
          />
        </Suspense>
        {hasSearched && (
          <Suspense fallback={null}>
            <ScrollToTop threshold={800} />
          </Suspense>
        )}

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

        {reportDialogOpen && (
          <Suspense fallback={null}>
            <ReportIssueDialog
              open={reportDialogOpen}
              onOpenChange={setReportDialogOpen}
              originalQuery={originalQuery}
              compiledQuery={lastSearchResult?.scryfallQuery || searchQuery}
              filters={activeFilters}
              requestId={currentRequestId || undefined}
            />
          </Suspense>
        )}

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
      </div>
    </ErrorBoundary>
  );
};

export default Index;
