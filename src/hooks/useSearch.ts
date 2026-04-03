/**
 * Search orchestration hook.
 * Manages search state, URL sync, infinite pagination, filtering, and analytics.
 * Extracted from Index.tsx to keep the page component focused on rendering.
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { queryToSlug, slugToQuery } from '@/lib/search-slug';
import type {
  SearchResult,
  UnifiedSearchBarHandle,
} from '@/components/UnifiedSearchBar';
import { searchCards } from '@/lib/scryfall/client';
import type { ScryfallCard } from '@/types/card';
import type { FilterState } from '@/types/filters';
import type { SearchIntent } from '@/types/search';
import { buildFilterQuery, validateScryfallQuery } from '@/lib/scryfall/query';
import { useAnalytics } from '@/hooks/useAnalytics';
import { CLIENT_CONFIG } from '@/lib/config';
import { useTranslation } from '@/lib/i18n';
import { LOCALE_TO_SCRYFALL_LANG } from '@/lib/i18n/constants';
import {
  getQueryQuality,
  updateQueryQuality,
} from '@/lib/search/quality-model';
import { useQueryIntelligence } from '@/hooks/useQueryIntelligence';

/** Generate unique request ID */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/** Increment the per-session search counter in sessionStorage */
function incrementSearchesPerSession(): void {
  const key = 'offmeta_searches_per_session';
  const current = parseInt(sessionStorage.getItem(key) || '0', 10);
  sessionStorage.setItem(key, String(current + 1));
}

/** Parse filter state from URL search params */
function parseFiltersFromUrl(
  params: URLSearchParams,
): Partial<FilterState> | null {
  const colors = params.get('colors');
  const types = params.get('types');
  const sort = params.get('sort');
  const cmcMin = params.get('cmc_min');
  const cmcMax = params.get('cmc_max');
  const format = params.get('format');

  if (!colors && !types && !sort && !cmcMin && !cmcMax && !format) return null;

  const result: Partial<FilterState> = {};
  if (colors) result.colors = colors.split(',').filter(Boolean);
  if (types) result.types = types.split(',').filter(Boolean);
  if (sort) result.sortBy = sort;
  if (format) result.format = format;
  if (cmcMin || cmcMax) {
    result.cmcRange = [
      cmcMin ? parseInt(cmcMin, 10) : 0,
      cmcMax ? parseInt(cmcMax, 10) : 16,
    ];
  }
  return result;
}

/** Encode filter state into URL search params (mutates params) */
function encodeFiltersToUrl(
  params: URLSearchParams,
  filters: FilterState | null,
) {
  // Remove all filter keys first
  params.delete('colors');
  params.delete('types');
  params.delete('sort');
  params.delete('cmc_min');
  params.delete('cmc_max');
  params.delete('format');

  if (!filters) return;

  if (filters.colors.length > 0) params.set('colors', filters.colors.join(','));
  if (filters.types.length > 0) params.set('types', filters.types.join(','));
  if (filters.sortBy && filters.sortBy !== 'name-asc')
    params.set('sort', filters.sortBy);
  if (filters.format) params.set('format', filters.format);
  if (filters.cmcRange[0] > 0)
    params.set('cmc_min', String(filters.cmcRange[0]));
  // Only encode cmcMax if it's not the default high value
  if (filters.cmcRange[1] < 16)
    params.set('cmc_max', String(filters.cmcRange[1]));
}

export function useSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const urlQuery = searchParams.get('q') || '';
  const slugQuery = params.slug ? slugToQuery(params.slug) : '';
  const effectiveUrlQuery = slugQuery || urlQuery;
  const queryClient = useQueryClient();
  const { locale } = useTranslation();
  const scryfallLang = LOCALE_TO_SCRYFALL_LANG[locale] ?? 'en';

  // Parse initial filter state from URL (stable across renders)
  const [initialUrlFilters] = useState(() => parseFiltersFromUrl(searchParams));

  // --- Core search state ---
  // Don't initialize searchQuery from URL — wait for translation
  const [searchQuery, setSearchQuery] = useState('');
  const [originalQuery, setOriginalQuery] = useState(effectiveUrlQuery);
  const [selectedCard, setSelectedCard] = useState<ScryfallCard | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSearchResult, setLastSearchResult] = useState<SearchResult | null>(
    null,
  );
  const [filteredCards, setFilteredCards] = useState<ScryfallCard[]>([]);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState | null>(null);
  const [lastIntent, setLastIntent] = useState<SearchIntent | null>(null);
  const [filtersResetKey, setFiltersResetKey] = useState(0);

  const searchBarRef = useRef<UnifiedSearchBarHandle>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const lastUrlQueryRef = useRef(effectiveUrlQuery);
  const initialUrlQuery = useRef(effectiveUrlQuery);
  const hasHandledInitialQuery = useRef(false);
  const hasRedirectedLegacy = useRef(false);
  const {
    trackSearch,
    trackSearchFailure,
    trackCardClick,
    trackPagination,
    trackFirstSearchStart,
    trackFirstSearchSuccess,
    trackFirstResultClick,
    trackFirstRefinement,
    trackEvent,
    shouldLogCacheEvent,
  } = useAnalytics();
  const paginationPageRef = useRef(1);
  const searchStartMsRef = useRef<number | null>(null);
  const [lastClickLatencyMs, setLastClickLatencyMs] = useState<number | null>(
    null,
  );
  const [refinementCount, setRefinementCount] = useState(0);
  const [struggleCount, setStruggleCount] = useState(0);
  const localQueryQualityScore = useMemo(
    () => getQueryQuality(originalQuery)?.score ?? 0,
    [originalQuery, lastClickLatencyMs, refinementCount, struggleCount],
  );
  const { data: serverIntelligence } = useQueryIntelligence(originalQuery);
  const serverConfidence = serverIntelligence?.confidence ?? 0;
  const serverSampleSize = serverIntelligence?.total_searches ?? 0;
  const shouldUseServerQuality = serverConfidence >= 0.3 && serverSampleSize >= 20;
  const effectiveQueryQualityScore = shouldUseServerQuality
    ? serverIntelligence?.search_quality_score ?? 0
    : localQueryQualityScore;

  // --- Redirect legacy ?q= URLs to /search/:slug ---
  useEffect(() => {
    if (urlQuery && !params.slug && !hasRedirectedLegacy.current) {
      hasRedirectedLegacy.current = true;
      navigate(`/search/${queryToSlug(urlQuery)}`, { replace: true });
    }
  }, [urlQuery, params.slug, navigate]);

  // --- Initial mount: trigger translation for URL query ---
  useEffect(() => {
    if (
      initialUrlQuery.current &&
      searchBarRef.current &&
      !hasHandledInitialQuery.current
    ) {
      hasHandledInitialQuery.current = true;
      lastUrlQueryRef.current = initialUrlQuery.current;
      searchBarRef.current.triggerSearch(initialUrlQuery.current);
    }
  }, []);

  // --- URL sync (browser back/forward for slug changes) ---
  const prevSlugQueryRef = useRef(slugQuery);

  useEffect(() => {
    if (slugQuery === prevSlugQueryRef.current) return undefined;

    prevSlugQueryRef.current = slugQuery;

    if (!slugQuery) {
      let cancelled = false;

      queueMicrotask(() => {
        if (cancelled) return;

        setSearchQuery('');
        setOriginalQuery('');
        setHasSearched(false);
        setLastSearchResult(null);
        setFilteredCards([]);
        setHasActiveFilters(false);
        setActiveFilters(null);
        setCurrentRequestId(null);
      });

      return () => {
        cancelled = true;
      };
    }

    return undefined;
  }, [slugQuery]);

  // Trigger search bar for slug changes (browser back/forward only, skip initial)
  useEffect(() => {
    if (slugQuery && slugQuery !== lastUrlQueryRef.current) {
      lastUrlQueryRef.current = slugQuery;
      if (searchBarRef.current) {
        searchBarRef.current.triggerSearch(slugQuery);
      }
    }
  }, [slugQuery]);

  // --- Validated query ---
  const validatedSearchQuery = useMemo(() => {
    if (!searchQuery) return '';
    return validateScryfallQuery(searchQuery).sanitized;
  }, [searchQuery]);

  // --- Infinite query ---
  const {
    data,
    isLoading: isSearching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['cards', validatedSearchQuery, scryfallLang],
    queryFn: ({ pageParam = 1 }) =>
      searchCards(validatedSearchQuery, pageParam, scryfallLang),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.has_more ? allPages.length + 1 : undefined,
    initialPageParam: 1,
    enabled: !!validatedSearchQuery,
    staleTime: CLIENT_CONFIG.CARD_SEARCH_STALE_TIME_MS,
  });

  // Refs for IntersectionObserver (avoid stale closures)
  const hasNextPageRef = useRef(hasNextPage);
  const isFetchingNextPageRef = useRef(isFetchingNextPage);

  useEffect(() => {
    hasNextPageRef.current = hasNextPage;
    isFetchingNextPageRef.current = isFetchingNextPage;
  }, [hasNextPage, isFetchingNextPage]);

  // --- Infinite scroll observer ---
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasNextPageRef.current &&
          !isFetchingNextPageRef.current
        ) {
          fetchNextPage();
        }
      },
      {
        threshold: CLIENT_CONFIG.INFINITE_SCROLL_THRESHOLD,
        rootMargin: CLIENT_CONFIG.INFINITE_SCROLL_ROOT_MARGIN,
      },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [fetchNextPage]);

  // --- Flatten pages ---
  const cards = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) || [];
  }, [data]);

  const totalCards = data?.pages[0]?.total_cards || 0;

  // --- Dynamic document title ---
  useEffect(() => {
    if (hasSearched && originalQuery) {
      document.title = `${originalQuery} — OffMeta MTG Search`;
    } else {
      document.title = 'OffMeta — Natural Language MTG Card Search';
    }
    return () => {
      document.title = 'OffMeta — Natural Language MTG Card Search';
    };
  }, [hasSearched, originalQuery]);

  // --- Track results count + zero-result failures ---
  useEffect(() => {
    if (!lastSearchResult || !hasSearched) return;

    if (totalCards > 0) {
      trackEvent('search_results', {
        query: originalQuery,
        translated_query: lastSearchResult.scryfallQuery,
        results_count: totalCards,
        request_id: currentRequestId ?? undefined,
      });
      trackFirstSearchSuccess({
        query: originalQuery,
        request_id: currentRequestId ?? undefined,
      });
      if (sessionStorage.getItem('offmeta_recovery_in_progress') === '1') {
        trackEvent('search_recovery_success', {
          query: originalQuery,
          request_id: currentRequestId ?? undefined,
        });
        updateQueryQuality(originalQuery, { recoveries: 1 });
        sessionStorage.removeItem('offmeta_recovery_in_progress');
      }
      const quality = getQueryQuality(originalQuery);
      if (quality) {
        trackEvent('search_quality_computed', {
          query: originalQuery,
          search_quality_score: quality.score,
        });
      }
    } else if (totalCards === 0 && !isSearching && validatedSearchQuery) {
      trackSearchFailure({
        query: originalQuery,
        translated_query: lastSearchResult.scryfallQuery,
        error_type: 'zero_results',
      });
      trackEvent('search_no_result_shown', {
        query: originalQuery,
        request_id: currentRequestId ?? undefined,
      });
      setStruggleCount((count) => count + 1);
      trackEvent('guided_suggestion_shown', {
        query: originalQuery,
        struggle_count: struggleCount + 1,
      });
    }
  }, [
    totalCards,
    lastSearchResult,
    originalQuery,
    trackEvent,
    trackFirstSearchSuccess,
    trackSearchFailure,
    struggleCount,
    currentRequestId,
    hasSearched,
    isSearching,
    validatedSearchQuery,
  ]);

  // --- Track pagination (load-more) ---
  const currentPageCount = data?.pages.length ?? 0;
  useEffect(() => {
    if (currentPageCount > 1 && currentPageCount > paginationPageRef.current) {
      trackPagination({
        query: originalQuery,
        from_page: paginationPageRef.current,
        to_page: currentPageCount,
      });
    }
    paginationPageRef.current = currentPageCount || 1;
  }, [currentPageCount, originalQuery, trackPagination]);

  const hasSortOverride =
    activeFilters?.sortBy && activeFilters.sortBy !== 'name-asc';
  const displayCards =
    hasActiveFilters || hasSortOverride ? filteredCards : cards;

  // --- Callbacks ---

  const handleSearch = useCallback(
    (query: string, result?: SearchResult, naturalQuery?: string) => {
      const requestId = generateRequestId();
      setCurrentRequestId(requestId);
      trackFirstSearchStart({
        query: naturalQuery || query,
        request_id: requestId,
      });
      searchStartMsRef.current = Date.now();
      updateQueryQuality(naturalQuery || query, { searches: 1 });

      setFilteredCards([]);
      setHasActiveFilters(false);
      setActiveFilters(null);
      setFiltersResetKey((prev) => prev + 1);

      const executedQuery = query.trim();
      setSearchQuery(executedQuery);
      setOriginalQuery(naturalQuery || query);
      setHasSearched(true);

      if (result) {
        setLastSearchResult({ ...result, scryfallQuery: executedQuery });
        setLastIntent(result.intent || null);
      } else {
        setLastSearchResult({
          scryfallQuery: executedQuery,
          explanation: undefined,
          showAffiliate: false,
        });
        setLastIntent(null);
      }

      queryClient.invalidateQueries({
        queryKey: ['cards', executedQuery, scryfallLang],
      });

      const urlValue = naturalQuery || query;
      if (urlValue) {
        lastUrlQueryRef.current = urlValue;
        navigate(`/search/${queryToSlug(urlValue)}`, { replace: true });
      } else {
        lastUrlQueryRef.current = '';
        navigate('/', { replace: true });
      }

      if (result) {
        // Track cache hit/miss via shouldLogCacheEvent
        const source = result.source || 'ai';
        if (source === 'cache' || source === 'deterministic') {
          const queryHash = executedQuery.substring(0, 100);
          if (shouldLogCacheEvent(queryHash)) {
            trackEvent('search', {
              query: naturalQuery || query,
              translated_query: result.scryfallQuery,
              results_count: 0,
              source,
            });
          }
        } else {
          trackSearch({
            query: naturalQuery || query,
            translated_query: result.scryfallQuery,
            results_count: 0,
            source,
          });
        }

        // Increment searches_per_session counter
        incrementSearchesPerSession();
      }

    },
    [
      trackSearch,
      trackFirstSearchStart,
      trackEvent,
      shouldLogCacheEvent,
      navigate,
      queryClient,
      scryfallLang,
    ],
  );

  const handleRerunEditedQuery = useCallback(
    (editedQuery: string) => {
      const requestId = generateRequestId();
      setCurrentRequestId(requestId);

      setFilteredCards([]);
      setHasActiveFilters(false);

      const filterQuery = buildFilterQuery(activeFilters);
      const combinedQuery = [editedQuery, filterQuery]
        .filter(Boolean)
        .join(' ')
        .trim();
      const validation = validateScryfallQuery(combinedQuery);

      if (!validation.valid) {
        setLastSearchResult((prev) =>
          prev
            ? {
                ...prev,
                scryfallQuery: validation.sanitized,
                validationIssues: validation.issues,
              }
            : {
                scryfallQuery: validation.sanitized,
                validationIssues: validation.issues,
                explanation: undefined,
                showAffiliate: false,
              },
        );
        return;
      }

      setSearchQuery(validation.sanitized);
      setHasSearched(true);

      setLastSearchResult((prev) =>
        prev
          ? {
              ...prev,
              scryfallQuery: validation.sanitized,
              validationIssues: [],
            }
          : {
              scryfallQuery: validation.sanitized,
              explanation: undefined,
              showAffiliate: false,
              validationIssues: [],
            },
      );

      queryClient.invalidateQueries({
        queryKey: ['cards', validation.sanitized, scryfallLang],
      });

      trackEvent('rerun_edited_query', {
        original_query: originalQuery,
        edited_query: editedQuery,
        request_id: requestId,
      });
      trackFirstRefinement({
        query: originalQuery,
        request_id: requestId,
      });
      setRefinementCount((count) => count + 1);
      updateQueryQuality(originalQuery, { refinements: 1 });
      trackEvent('narrow_results_prompt_shown', {
        query: originalQuery,
        refinement_count: refinementCount + 1,
      });
    },
    [
      queryClient,
      originalQuery,
      trackEvent,
      trackFirstRefinement,
      activeFilters,
      scryfallLang,
      refinementCount,
    ],
  );

  const handleCardClick = useCallback(
    (card: ScryfallCard, index: number) => {
      trackCardClick({
        card_id: card.id,
        card_name: card.name,
        set_code: card.set,
        rarity: card.rarity,
        position_in_results: index,
      });
      trackFirstResultClick({
        query: originalQuery,
        card_id: card.id,
      });
      if (searchStartMsRef.current) {
        const latencyMs = Date.now() - searchStartMsRef.current;
        setLastClickLatencyMs(latencyMs);
        updateQueryQuality(originalQuery, {
          clicks: 1,
          avgTimeToClickMs: latencyMs,
        });
        if (latencyMs < 1200) {
          sessionStorage.setItem('offmeta_fast_click_query', originalQuery);
          trackEvent('fast_click_detected', {
            query: originalQuery,
            time_to_click_ms: latencyMs,
          });
        }
      }
      setSelectedCard(card);
    },
    [originalQuery, trackCardClick, trackFirstResultClick, trackEvent],
  );

  const handleTryExample = useCallback((query: string) => {
    searchBarRef.current?.triggerSearch(query);
  }, []);

  const handleRegenerateTranslation = useCallback(() => {
    if (!originalQuery) return;
    searchBarRef.current?.triggerSearch(originalQuery, {
      bypassCache: true,
      cacheSalt: `${Date.now()}`,
    });
  }, [originalQuery]);

  const handleFilteredCards = useCallback(
    (
      filtered: ScryfallCard[],
      filtersActive: boolean,
      filters: FilterState,
    ) => {
      setFilteredCards(filtered);
      setHasActiveFilters(filtersActive);
      setActiveFilters(filters);

      // Sync filters to URL
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (filtersActive) {
            encodeFiltersToUrl(next, filters);
          } else {
            encodeFiltersToUrl(next, null);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return {
    // State
    locale,
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
    queryQualityScore: effectiveQueryQualityScore,
    queryQualityConfidence: shouldUseServerQuality ? serverConfidence : 0,
    queryQualitySampleSize: shouldUseServerQuality ? serverSampleSize : 0,

    // Data
    cards,
    displayCards,
    totalCards,
    isSearching,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,

    // Refs
    searchBarRef,
    loadMoreRef,

    // Callbacks
    handleSearch,
    handleRerunEditedQuery,
    handleCardClick,
    handleTryExample,
    handleRegenerateTranslation,
    handleFilteredCards,

    // Initial URL filters (for hydrating SearchFilters on load)
    initialUrlFilters,
  };
}
