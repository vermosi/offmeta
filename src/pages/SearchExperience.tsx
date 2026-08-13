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
import { HomepageTour } from '@/components/HomepageTour';
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
import { ScryfallQueryDisclosure } from '@/components/ScryfallQueryDisclosure';

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
  const [showFirstUseHint, setShowFirstUseHint] = useState(() => {
    try {
      return localStorage.getItem('offmeta_home_hint_dismissed') !== '1';
    } catch {
      return true;
    }
  });
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

  /**
   * Append a matched-concept token from the "Why this matches" badge to the
   * current Scryfall query and rerun the search. No-op if the token is already
   * present, so repeated clicks don't duplicate constraints.
   */
  const handleRefineWithMatch = useCallback(
    (token: string, label: string) => {
      if (!token) return;
      const base = (searchQuery || '').trim();
      const alreadyIncluded = base
        .split(/\s+/)
        .some((tok) => tok.toLowerCase() === token.toLowerCase());
      const nextQuery = alreadyIncluded ? base : `${base} ${token}`.trim();
      trackEvent('why_matches_refine_clicked', {
        query: originalQuery,
        scryfall_query: base,
        refine_token: token,
        refine_label: label,
        already_included: alreadyIncluded,
      });
      if (alreadyIncluded) return;
      handleRerunEditedQuery(nextQuery);
    },
    [searchQuery, originalQuery, handleRerunEditedQuery, trackEvent],
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
          className="fixed inset-0 pointer-events-none bg-page-noise"
          aria-hidden="true"
        />

        <Header />

        {!showResultsMode && <HeroSection />}
        {!hasSearched && (
          <section className="relative border-y border-border/40 bg-card/25 px-4 py-7 sm:py-9">
            <div className="container-main">
              <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
                <div className="space-y-3 rounded-2xl border border-border/60 bg-background/70 p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Why OffMeta
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    Search like a player, not like a query language.
                  </h2>
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                    OffMeta turns plain English into real Scryfall search, shows
                    you exactly what it built, and keeps the query editable.
                    That means faster first results without losing control.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1 text-sm">
                    <Link
                      to="/about"
                      className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-2 font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-accent/5"
                    >
                      Learn the difference
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <Link
                      to="/guides"
                      className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-2 font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-accent/5"
                    >
                      Browse guides
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm">
                    <Search
                      className="h-5 w-5 text-accent"
                      aria-hidden="true"
                    />
                    <h3 className="mt-3 text-sm font-semibold text-foreground">
                      Type the job
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Start with the thing you need, like a hate card, combo
                      piece, or budget answer.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm">
                    <SlidersHorizontal
                      className="h-5 w-5 text-accent"
                      aria-hidden="true"
                    />
                    <h3 className="mt-3 text-sm font-semibold text-foreground">
                      See the query
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Every result exposes the Scryfall syntax so you can edit
                      or reuse it.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm">
                    <Sparkles
                      className="h-5 w-5 text-accent"
                      aria-hidden="true"
                    />
                    <h3 className="mt-3 text-sm font-semibold text-foreground">
                      Keep refining
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Jump to similar cards, related searches, and follow-up
                      actions without starting over.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
        {!hasSearched && (
          <div id="home-quick-paths">
            <HomepageQuickPaths />
          </div>
        )}
        {!hasSearched && <HomepageTour />}

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

            {!hasSearched && showFirstUseHint && (
              <div className="mx-auto max-w-3xl rounded-2xl border border-border/60 bg-card/60 px-4 py-3 text-sm text-muted-foreground shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="leading-relaxed">
                    Try a plain-English search like{' '}
                    <span className="font-medium text-foreground">
                      "cards that punish treasure decks"
                    </span>{' '}
                    or{' '}
                    <span className="font-medium text-foreground">
                      "cards similar to Seedborn Muse"
                    </span>
                    .
                  </p>
                  <button
                    type="button"
                    className="self-start rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-accent/5"
                    onClick={() => {
                      setShowFirstUseHint(false);
                      try {
                        localStorage.setItem(
                          'offmeta_home_hint_dismissed',
                          '1',
                        );
                      } catch {
                        // ignore storage failures
                      }
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <SearchProgressIndicator
              isSearching={isSearching}
              hasSearched={hasSearched}
              scryfallQuery={lastSearchResult?.scryfallQuery}
              cardCount={cards.length}
            />

            {!hasSearched && (
              <div id="home-examples">
                <Suspense fallback={null}>
                  <ExampleQueriesCarousel onTrySearch={handleTryExample} />
                </Suspense>
              </div>
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
              <div className="animate-reveal mb-5 sm:mb-7">
                <div className="rounded-2xl border border-border/60 bg-gradient-to-r from-card/85 via-background/80 to-card/85 px-4 py-3.5 shadow-sm backdrop-blur">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        Search results
                      </p>
                      <h1 className="mt-1 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                        {t('search.resultsFor', 'Results for "{query}"').replace(
                          '{query}',
                          originalQuery || searchQuery || '',
                        )}
                      </h1>
                      {hasSearched && totalCards > 0 && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t('results.summaryCards', '{count} cards').replace(
                            '{count}',
                            totalCards.toLocaleString(),
                          )}
                        </p>
                      )}
                    </div>
                    <a
                      href="#search-results"
                      className="inline-flex items-center rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-accent/5"
                    >
                      Jump to results
                    </a>
                  </div>
                </div>
              </div>
            )}

            {cards.length > 0 && !isSearching && (
              <div className="sticky top-[56px] sm:top-[68px] z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2 bg-background/80 backdrop-blur-xl border-b border-border/40">
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
                  queryStrip={
                    <ScryfallQueryDisclosure
                      scryfallQuery={(
                        lastSearchResult?.scryfallQuery || searchQuery
                      ).trim()}
                      metaLabel={
                        typeof translationConfidence === 'number'
                          ? `${translationSourceLabel} · ${Math.round(translationConfidence * 100)}%`
                          : translationSourceLabel
                      }
                    >
                      <EditableQueryBar
                        scryfallQuery={(
                          lastSearchResult?.scryfallQuery || searchQuery
                        ).trim()}
                        confidence={lastSearchResult?.explanation?.confidence}
                        isLoading={isSearching}
                        originalQuery={originalQuery}
                        onRerun={handleRerunEditedQuery}
                        onRegenerate={handleRegenerateTranslation}
                        validationError={
                          lastSearchResult?.validationIssues?.length
                            ? lastSearchResult.validationIssues.join(' • ')
                            : null
                        }
                      />
                    </ScryfallQueryDisclosure>
                  }
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
                onRefineWithMatch={handleRefineWithMatch}
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
        </main>

        {!hasSearched && (
          <div className="container-main" aria-hidden="true">
            <div className="section-divider" />
          </div>
        )}
        {!hasSearched && (
          <Suspense fallback={null}>
            <ScryfallComparison onTrySearch={handleTryExample} />
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
