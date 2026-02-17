/**
 * Search orchestration hook.
 * Manages search state, URL sync, infinite pagination, filtering, and analytics.
 * Extracted from Index.tsx to keep the page component focused on rendering.
 */

import {
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
} from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import type { SearchResult, UnifiedSearchBarHandle } from '@/components/UnifiedSearchBar';
import { searchCards } from '@/lib/scryfall/client';
import type { ScryfallCard } from '@/types/card';
import type { FilterState } from '@/types/filters';
import type { SearchIntent } from '@/types/search';
import { buildFilterQuery, validateScryfallQuery } from '@/lib/scryfall/query';
import { useAnalytics } from '@/hooks/useAnalytics';
import { CLIENT_CONFIG } from '@/lib/config';
import { useTranslation } from '@/lib/i18n';
import { LOCALE_TO_SCRYFALL_LANG } from '@/lib/i18n/constants';

/** Generate unique request ID */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/** Parse filter state from URL search params */
function parseFiltersFromUrl(params: URLSearchParams): Partial<FilterState> | null {
  const colors = params.get('colors');
  const types = params.get('types');
  const sort = params.get('sort');
  const cmcMin = params.get('cmc_min');
  const cmcMax = params.get('cmc_max');

  if (!colors && !types && !sort && !cmcMin && !cmcMax) return null;

  const result: Partial<FilterState> = {};
  if (colors) result.colors = colors.split(',').filter(Boolean);
  if (types) result.types = types.split(',').filter(Boolean);
  if (sort) result.sortBy = sort;
  if (cmcMin || cmcMax) {
    result.cmcRange = [
      cmcMin ? parseInt(cmcMin, 10) : 0,
      cmcMax ? parseInt(cmcMax, 10) : 16,
    ];
  }
  return result;
}

/** Encode filter state into URL search params (mutates params) */
function encodeFiltersToUrl(params: URLSearchParams, filters: FilterState | null) {
  // Remove all filter keys first
  params.delete('colors');
  params.delete('types');
  params.delete('sort');
  params.delete('cmc_min');
  params.delete('cmc_max');

  if (!filters) return;

  if (filters.colors.length > 0) params.set('colors', filters.colors.join(','));
  if (filters.types.length > 0) params.set('types', filters.types.join(','));
  if (filters.sortBy && filters.sortBy !== 'name-asc') params.set('sort', filters.sortBy);
  if (filters.cmcRange[0] > 0) params.set('cmc_min', String(filters.cmcRange[0]));
  // Only encode cmcMax if it's not the default high value
  if (filters.cmcRange[1] < 16) params.set('cmc_max', String(filters.cmcRange[1]));
}

export function useSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const queryClient = useQueryClient();
  const { locale } = useTranslation();
  const scryfallLang = LOCALE_TO_SCRYFALL_LANG[locale] ?? 'en';

  // Parse initial filter state from URL (stable across renders)
  const [initialUrlFilters] = useState(() => parseFiltersFromUrl(searchParams));

  // --- Core search state ---
  // Don't initialize searchQuery from URL — wait for translation
  const [searchQuery, setSearchQuery] = useState('');
  const [originalQuery, setOriginalQuery] = useState(urlQuery);
  const [selectedCard, setSelectedCard] = useState<ScryfallCard | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSearchResult, setLastSearchResult] = useState<SearchResult | null>(null);
  const [filteredCards, setFilteredCards] = useState<ScryfallCard[]>([]);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState | null>(null);
  const [lastIntent, setLastIntent] = useState<SearchIntent | null>(null);
  const [filtersResetKey, setFiltersResetKey] = useState(0);

  const searchBarRef = useRef<UnifiedSearchBarHandle>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const lastUrlQueryRef = useRef(urlQuery);
  const initialUrlQuery = useRef(urlQuery);
  const hasHandledInitialQuery = useRef(false);
  const { trackSearch, trackCardClick, trackEvent } = useAnalytics();

  // --- Initial mount: trigger translation for ?q= parameter ---
  useEffect(() => {
    if (initialUrlQuery.current && searchBarRef.current && !hasHandledInitialQuery.current) {
      hasHandledInitialQuery.current = true;
      lastUrlQueryRef.current = initialUrlQuery.current;
      searchBarRef.current.triggerSearch(initialUrlQuery.current);
    }
  }, []);

  // --- URL sync (browser back/forward, manual edits) ---
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);
  if (urlQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlQuery);

    if (!urlQuery) {
      setSearchQuery('');
      setOriginalQuery('');
      setHasSearched(false);
      setLastSearchResult(null);
      setFilteredCards([]);
      setHasActiveFilters(false);
      setCurrentRequestId(null);
    }
  }

  // Trigger search bar for URL query changes (browser back/forward only, skip initial)
  useEffect(() => {
    if (urlQuery && urlQuery !== lastUrlQueryRef.current) {
      lastUrlQueryRef.current = urlQuery;
      if (searchBarRef.current) {
        searchBarRef.current.triggerSearch(urlQuery);
      }
    }
  }, [urlQuery]);

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
    queryFn: ({ pageParam = 1 }) => searchCards(validatedSearchQuery, pageParam, scryfallLang),
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

  // --- Track results count ---
  useEffect(() => {
    if (totalCards > 0 && lastSearchResult) {
      trackEvent('search_results', {
        query: originalQuery,
        translated_query: lastSearchResult.scryfallQuery,
        results_count: totalCards,
        request_id: currentRequestId ?? undefined,
      });
    }
  }, [totalCards, lastSearchResult, originalQuery, trackEvent, currentRequestId]);

  const displayCards = hasActiveFilters ? filteredCards : cards;

  // --- Callbacks ---

  const handleSearch = useCallback(
    (query: string, result?: SearchResult, naturalQuery?: string) => {
      const requestId = generateRequestId();
      setCurrentRequestId(requestId);

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

      queryClient.invalidateQueries({ queryKey: ['cards', executedQuery, scryfallLang] });

      const urlValue = naturalQuery || query;
      if (urlValue) {
        lastUrlQueryRef.current = urlValue;
        setSearchParams({ q: urlValue }, { replace: true });
      } else {
        lastUrlQueryRef.current = '';
        setSearchParams({}, { replace: true });
      }

      if (result) {
        trackSearch({
          query: naturalQuery || query,
          translated_query: result.scryfallQuery,
          results_count: 0,
        });
      }
    },
    [trackSearch, setSearchParams, queryClient, scryfallLang],
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
            ? { ...prev, scryfallQuery: validation.sanitized, validationIssues: validation.issues }
            : { scryfallQuery: validation.sanitized, validationIssues: validation.issues, explanation: undefined, showAffiliate: false },
        );
        return;
      }

      setSearchQuery(validation.sanitized);
      setHasSearched(true);

      setLastSearchResult((prev) =>
        prev
          ? { ...prev, scryfallQuery: validation.sanitized, validationIssues: [] }
          : { scryfallQuery: validation.sanitized, explanation: undefined, showAffiliate: false, validationIssues: [] },
      );

      queryClient.invalidateQueries({ queryKey: ['cards', validation.sanitized, scryfallLang] });

      trackEvent('rerun_edited_query', {
        original_query: originalQuery,
        edited_query: editedQuery,
        request_id: requestId,
      });
    },
    [queryClient, originalQuery, trackEvent, activeFilters, scryfallLang],
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
      setSelectedCard(card);
    },
    [trackCardClick],
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
    (filtered: ScryfallCard[], filtersActive: boolean, filters: FilterState) => {
      setFilteredCards(filtered);
      setHasActiveFilters(filtersActive);
      setActiveFilters(filters);

      // Sync filters to URL
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (filtersActive) {
          encodeFiltersToUrl(next, filters);
        } else {
          encodeFiltersToUrl(next, null);
        }
        return next;
      }, { replace: true });
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
