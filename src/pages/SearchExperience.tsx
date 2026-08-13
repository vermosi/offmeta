/**
 * Home page — the primary search interface.
 * Orchestrates the search bar, card grid, filters, modals, comparison,
 * discovery sections, and tabbed results (Cards | Similar | Deck Ideas | Explain).
 * All search state is managed via the `useSearch` hook.
 * @module pages/Index
 */
import { trackFunnelStep, trackFunnelMilestone } from '@/lib/analytics/funnels';
import {
  lazy,
  Suspense,
  useEffect,
  useCallback,
  useState,
  useMemo,
  useRef,
} from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { UnifiedSearchBar } from '@/components/UnifiedSearchBar';
const EditableQueryBar = lazy(() =>
  import('@/components/EditableQueryBar').then((m) => ({
    default: m.EditableQueryBar,
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
import { HomepageQuickPaths } from '@/components/HomepageQuickPaths';
import { GoogleAdsConversionHelper } from '@/components/GoogleAdsConversionHelper';
import { Link } from 'react-router-dom';

import { ArrowRight, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
const ExampleQueriesCarousel = lazy(() =>
  import('@/components/ExampleQueriesCarousel').then((m) => ({
    default: m.ExampleQueriesCarousel,
  })),
);

const UnderstoodSummary = lazy(() =>
  import('@/components/UnderstoodSummary').then((m) => ({
    default: m.UnderstoodSummary,
  })),
);
const ScryfallComparison = lazy(() =>
  import('@/components/ScryfallComparison').then((m) => ({
    default: m.ScryfallComparison,
  })),
);
const InstantDemoPreview = lazy(() =>
  import('@/components/InstantDemoPreview').then((m) => ({
    default: m.InstantDemoPreview,
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
import {
  type ViewMode,
  getStoredViewMode,
  storeViewMode,
} from '@/lib/view-mode-storage';
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
const RelatedSearchesSection = lazy(() =>
  import('@/components/RelatedSearchesSection').then((m) => ({
    default: m.RelatedSearchesSection,
  })),
);

const SearchResultsArea = lazy(() =>
  import('@/components/SearchResultsArea').then((m) => ({
    default: m.SearchResultsArea,
  })),
);
import { SkipLinks } from '@/components/SkipLinks';
import { SearchProgressIndicator } from '@/components/SearchProgressIndicator';
import { SearchDeskHeader } from '@/components/SearchDeskHeader';

import { useAnalytics } from '@/hooks/useAnalytics';
import { useAuth } from '@/hooks/useAuth';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useNoIndex } from '@/hooks/useNoIndex';
import { useRovingTabIndex } from '@/hooks/useRovingTabIndex';
import { useSearch } from '@/hooks/useSearch';
import { useSearchRenderProfiler } from '@/hooks/useSearchRenderProfiler';
import { useTranslation } from '@/lib/i18n';
import { parseViewMode } from '@/lib/search/url-params';

const IS_TEST_MODE = import.meta.env.MODE === 'test';

const Index = () => {
  const { t } = useTranslation();
  const location = useLocation();

  const {
    trackLandingPageView,
    trackHomePageView,
    trackFirstReturnVisit,
    trackEvent,
  } = useAnalytics();
  useAuth();
  const lastTrackedRouteRef = useRef<string | null>(null);

  const {
    searchQuery,
    originalQuery,
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
    queryQualityScore,
    queryQualityConfidence,
    queryQualitySampleSize,
    cards,
    displayCards,
    totalCards,
    isSearching,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    error,
    isError,
    fetchNextPage,
    retryNextPage,
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
  const [hasQueryParam] = useState(() => {
    if (!location.search) return false;
    return new URLSearchParams(location.search).has('q');
  });

  // Profile the render side of the search flow. No-op unless
  // `localStorage.offmeta_profile_search === '1'` (auto-on in dev).
  useSearchRenderProfiler({
    scryfallQuery: lastSearchResult?.scryfallQuery ?? searchQuery,
    cardCount: cards.length,
    isSearching,
  });

  // View mode toggle — URL wins over the stored preference so a shared
  // link reproduces the exact layout.
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    const fromUrl = parseViewMode(
      new URLSearchParams(window.location.search).get('view'),
    );
    return fromUrl ?? getStoredViewMode();
  });

  const setViewMode = useCallback(
    (mode: ViewMode) => {
      setViewModeState(mode);
      storeViewMode(mode);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (mode === 'grid') next.delete('view');
          else next.set('view', mode);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Keep the toggle in sync when the URL changes from browser back/forward.
  const urlViewMode = parseViewMode(searchParams.get('view')) ?? 'grid';
  useEffect(() => {
    setViewModeState((prev) => (prev === urlViewMode ? prev : urlViewMode));
  }, [urlViewMode]);

  // Cards is the only results view — Similar / Deck Ideas / Explain removed.
  const activeTab: ResultsTab = 'cards';

  const isDeckQuery = /\b(deck|build|commander|strategy|brew|edh)\b/i.test(
    originalQuery,
  );

  const valuePoints = [
    {
      icon: Search,
      accent: 'bg-mtg-blue',
      title: t('home.valueTypeTitle', 'Type the job'),
      body: t(
        'home.valueTypeBody',
        'Start with the thing you need: a hate card, a combo piece, a budget answer.',
      ),
    },
    {
      icon: SlidersHorizontal,
      accent: 'bg-mtg-red',
      title: t('home.valueQueryTitle', 'See the query'),
      body: t(
        'home.valueQueryBody',
        'Every result exposes the Scryfall syntax so you can edit or reuse it.',
      ),
    },
    {
      icon: Sparkles,
      accent: 'bg-mtg-green',
      title: t('home.valueRefineTitle', 'Keep refining'),
      body: t(
        'home.valueRefineBody',
        'Jump to similar cards, related searches, and follow-ups without starting over.',
      ),
    },
  ];

  // Prevent indexing of query landing pages and zero-result search pages.
  useNoIndex(
    hasQueryParam || (hasSearched && !isSearching && totalCards === 0),
  );

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

  // Keyboard shortcuts
  const focusSearch = useCallback(() => {
    const input = document.getElementById('search-input');
    input?.focus();
  }, []);
  useKeyboardShortcuts({ onFocusSearch: focusSearch });

  // Roving tabindex column count based on view mode
  const rovingColumns = useMemo(() => {
    if (viewMode === 'list') return 1;
    return 4;
  }, [viewMode]);

  const rovingActivate = useCallback(
    (index: number) => {
      if (displayCards[index]) {
        handleCardClick(displayCards[index], index);
      }
    },
    [displayCards, handleCardClick],
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

  // Handle hash-based scroll: supports `#pos=<pixels>` for shared
  // deep-links that restore the sender's scroll position after
  // results render, and `#<element-id>` for anchor navigation.
  const scrollAnchorAppliedRef = useRef(false);
  useEffect(() => {
    if (scrollAnchorAppliedRef.current) return;
    const hash = window.location.hash;
    if (!hash) return;
    const isPos = hash.startsWith('#pos=');
    if (isPos) {
      if (!hasSearched || isSearching || cards.length === 0) return;
      const y = parseInt(hash.slice(5), 10);
      if (Number.isFinite(y) && y >= 0) {
        const timeout = setTimeout(() => {
          window.scrollTo({ top: y, behavior: 'smooth' });
          scrollAnchorAppliedRef.current = true;
        }, 400);
        return () => clearTimeout(timeout);
      }
      scrollAnchorAppliedRef.current = true;
      return;
    }
    const timeout = setTimeout(() => {
      const el = document.getElementById(hash.slice(1));
      el?.scrollIntoView({ behavior: 'smooth' });
      scrollAnchorAppliedRef.current = true;
    }, 300);
    return () => clearTimeout(timeout);
  }, [hasSearched, isSearching, cards.length]);

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

  // Time-to-first-results (once per user). Measures ms from initial page mount
  // to the moment the first non-empty result set renders, capturing the
  // real perceived latency for a first-time visitor.
  const mountedAtRef = useRef<number>(
    typeof performance !== 'undefined' ? performance.now() : Date.now(),
  );
  const firstResultsTrackedRef = useRef(false);

  // Funnel step: a search produced results (fires once per query).
  const funnelSearchQueryRef = useRef<string | null>(null);
  useEffect(() => {
    if (isSearching || !hasSearched || !originalQuery) return;
    if (funnelSearchQueryRef.current === originalQuery) return;
    funnelSearchQueryRef.current = originalQuery;
    trackFunnelStep('search', {
      query: originalQuery.slice(0, 200),
      results_count: cards.length,
      has_results: cards.length > 0,
      source: lastSearchResult?.source ?? 'ai',
    });
  }, [
    cards.length,
    hasSearched,
    isSearching,
    lastSearchResult?.source,
    originalQuery,
  ]);

  useEffect(() => {
    if (firstResultsTrackedRef.current) return;
    if (isSearching || !hasSearched || cards.length === 0) return;
    firstResultsTrackedRef.current = true;
    // Onboarding milestone: first time this visitor ever saw API results.
    trackFunnelMilestone('first_result', {
      results_count: cards.length,
      source: lastSearchResult?.source ?? 'ai',
    });
    const flagKey = 'offmeta_once:first_time_to_results';

    try {
      if (localStorage.getItem(flagKey) === '1') return;
      localStorage.setItem(flagKey, '1');
    } catch {
      /* best-effort — proceed without persistence */
    }
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    trackEvent('first_time_to_results', {
      duration_ms: Math.round(now - mountedAtRef.current),
      results_count: cards.length,
      query: originalQuery,
      source: lastSearchResult?.source ?? 'ai',
    });
  }, [
    cards.length,
    hasSearched,
    isSearching,
    lastSearchResult?.source,
    originalQuery,
    trackEvent,
  ]);

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
      const routeData = {
        path: location.pathname,
        search: location.search || undefined,
        referrer: document.referrer || undefined,
      };
      trackLandingPageView(routeData);
      trackHomePageView(routeData);
    }
  }, [
    hasSearched,
    location.hash,
    location.pathname,
    location.search,
    trackLandingPageView,
    trackHomePageView,
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
      <GoogleAdsConversionHelper />
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
          className="fixed inset-0 pointer-events-none bg-mana-ambience"
          aria-hidden="true"
        />
        <div
          className="fixed inset-0 pointer-events-none bg-page-noise"
          aria-hidden="true"
        />


        <Header />

        {!showResultsMode && <HeroSection />}


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

            <SearchProgressIndicator
              isSearching={isSearching}
              hasSearched={hasSearched}
              scryfallQuery={lastSearchResult?.scryfallQuery}
              cardCount={cards.length}
            />

            {/* Real cards, immediately — the index should look like Magic
                before it looks like marketing. */}
            {!hasSearched && (
              <Suspense fallback={null}>
                <InstantDemoPreview onTrySearch={handleTryExample} />
              </Suspense>
            )}



            {isSearching && originalQuery && (
              <Suspense fallback={null}>
                <UnderstoodSummary
                  key={originalQuery}
                  originalQuery={originalQuery}
                  onAdjust={(refined) => {
                    trackEvent('understood_summary_adjust', {
                      query: originalQuery,
                      refined_query: refined,
                    });
                    handleRerunEditedQuery(refined);
                  }}
                />
              </Suspense>
            )}

            {showResultsMode && (
              <SearchDeskHeader
                originalQuery={originalQuery || searchQuery}
                scryfallQuery={(lastSearchResult?.scryfallQuery || searchQuery).trim()}
                intent={lastSearchResult?.intent || lastIntent}
                totalCards={totalCards}
                shownCards={displayCards.length}
                sourceLabel={translationSourceLabel}
                confidence={
                  typeof translationConfidence === 'number' ? translationConfidence : null
                }
                warnings={
                  lastSearchResult?.validationIssues?.length
                    ? lastSearchResult.validationIssues
                    : (lastSearchResult?.intent?.warnings ?? [])
                }
                editor={
                  <Suspense fallback={null}>
                    <EditableQueryBar
                      scryfallQuery={(
                        lastSearchResult?.scryfallQuery || searchQuery
                      ).trim()}
                      confidence={lastSearchResult?.explanation?.confidence}
                      isLoading={isSearching}
                      onRerun={handleRerunEditedQuery}
                      onRegenerate={handleRegenerateTranslation}
                      validationError={
                        lastSearchResult?.validationIssues?.length
                          ? lastSearchResult.validationIssues.join(' • ')
                          : null
                      }
                    />
                  </Suspense>
                }
              />
            )}

            {cards.length > 0 && !isSearching && (
              <div className="sticky top-[56px] z-30 -mx-4 border-b border-border/40 bg-background/85 px-4 py-1.5 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                <ResultsToolbar
                  cards={cards}
                  displayCards={displayCards}
                  totalCards={totalCards}
                  activeFilters={activeFilters}
                  filtersResetKey={filtersResetKey}
                  initialUrlFilters={initialUrlFilters}
                  onFilteredCards={handleFilteredCards}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  pendingFilterOverride={pendingFilterOverride}
                  filterOverrideKey={filterOverrideKey}
                />
              </div>
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
                isFetchNextPageError={isFetchNextPageError}
                error={error}
                isError={isError}
                fetchNextPage={fetchNextPage}
                retryNextPage={retryNextPage}
                handleCardClick={handleCardClick}
                handleTryExample={handleTryExample}
                loadMoreRef={loadMoreRef}
                getRovingProps={getRovingProps}
                onTrySuggestion={handleTrySuggestion}
                onRelatedCardClick={handleTryExample}
                activeFilters={activeFilters}
                onApplyFilterPatch={applyFilterPatch}
                onClearAllFilters={clearAllFilters}
                intent={lastSearchResult?.intent || lastIntent}
              />
            </Suspense>
          )}

          {/* Follow-up discovery — moved below results to keep the top clean */}
          {hasSearched &&
            !isSearching &&
            totalCards > 0 &&
            activeTab === 'cards' && (
              <div className="container-main space-y-3 pt-6">
                <Suspense fallback={null}>
                  <RelatedSearchesSection
                    originalQuery={originalQuery}
                    intent={lastSearchResult?.intent || lastIntent}
                    topCard={cards[0]}
                    onRefine={handleTryExample}
                  />
                </Suspense>
                <Suspense fallback={null}>
                  <SearchNextActions
                    intent={lastSearchResult?.intent || lastIntent}
                    originalQuery={originalQuery}
                    totalCards={totalCards}
                    isDeckQuery={isDeckQuery}
                    queryQualityScore={queryQualityScore}
                  />
                </Suspense>
              </div>
            )}
        

        {/* Below the fold: the argument for OffMeta, kept after the cards. */}
        {!hasSearched && (
          <section className="relative mt-10 border-t border-border/50 py-10 sm:py-14">
            <div className="container-main">
              <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-muted-foreground sm:text-[11px]">
                {t('home.whyEyebrow', 'Why OffMeta')}
              </p>
              <div className="mt-4 grid gap-8 lg:grid-cols-12 lg:items-start">
                <div className="lg:col-span-5">
                  <h2 className="font-display text-3xl font-extrabold uppercase leading-[0.9] tracking-tight text-foreground sm:text-4xl">
                    {t('home.whyTitle', 'Search like a player,')}
                    <br />
                    <span className="font-editorial text-[0.92em] font-normal normal-case italic tracking-normal text-accent">
                      {t('home.whyTitleAccent', 'not a query language.')}
                    </span>
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {t(
                      'home.whyDescription',
                      'OffMeta turns plain English into real Scryfall search, shows you exactly what it built, and keeps the query editable. Faster first results without losing control.',
                    )}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-4 font-mono text-[11px] uppercase tracking-[0.18em]">
                    <Link
                      to="/about"
                      className="inline-flex items-center gap-2 border-b border-border/60 pb-1 text-foreground transition-colors hover:border-accent"
                    >
                      {t('home.learnDifference', 'Learn the difference')}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                    <Link
                      to="/guides"
                      className="inline-flex items-center gap-2 border-b border-border/60 pb-1 text-foreground transition-colors hover:border-accent"
                    >
                      {t('home.browseGuides', 'Browse guides')}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>

                <div className="grid gap-px overflow-hidden border border-border/50 bg-border/50 sm:grid-cols-3 lg:col-span-7">
                  {valuePoints.map(({ icon: Icon, accent, title, body }) => (
                    <div key={title} className="bg-background/80 p-5">
                      <span
                        className={`block h-px w-8 ${accent}`}
                        aria-hidden="true"
                      />
                      <Icon
                        className="mt-4 h-4 w-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <h3 className="mt-3 font-display text-sm font-bold uppercase tracking-tight text-foreground">
                        {title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {!hasSearched && (
          <div id="home-examples" className="container-main pb-2">
            <Suspense fallback={null}>
              <ExampleQueriesCarousel onTrySearch={handleTryExample} />
            </Suspense>
          </div>
        )}

        {!hasSearched && (
          <div id="home-quick-paths">
            <HomepageQuickPaths />
          </div>
        )}


        {!hasSearched && (
          <Suspense fallback={null}>
            <ScryfallComparison onTrySearch={handleTryExample} />
          </Suspense>
        )}
        </main>

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
      </div>
    </ErrorBoundary>
  );
};

export default Index;
