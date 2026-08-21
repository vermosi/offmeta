/**
 * Unified search bar component for natural language MTG card search.
 * Presentational component — behavior extracted into dedicated hooks.
 */

import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { Search, Loader2, X, Clock, Sparkles, Database } from 'lucide-react';
import { markOnce } from '@/lib/analytics/oncePerSession';
import { useIsMobile } from '@/hooks/useMobile';
import { useSearchContext } from '@/hooks/useSearchContext';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useSearchHandler, type SearchPhase } from '@/hooks/useSearchHandler';
import { useAnalytics } from '@/hooks/useAnalytics';
const SearchFeedback = lazy(() =>
  import('@/components/SearchFeedback').then((m) => ({
    default: m.SearchFeedback,
  })),
);
const SearchHelpModal = lazy(() =>
  import('@/components/SearchHelpModal/SearchHelpModal').then((m) => ({
    default: m.SearchHelpModal,
  })),
);
import type { FilterState } from '@/types/filters';
import type { SearchIntent } from '@/types/search';
import type { ScryfallCard } from '@/types/card';
import { useTranslation } from '@/lib/i18n';

const VoiceSearchControl = lazy(() =>
  import('@/components/VoiceSearchControl').then((m) => ({
    default: m.VoiceSearchControl,
  })),
);

export interface SearchResult {
  scryfallQuery: string;
  explanation?: {
    readable: string;
    assumptions: string[];
    confidence: number;
  };
  showAffiliate?: boolean;
  validationIssues?: string[];
  intent?: SearchIntent;
  source?: string;
  recommendationCards?: ScryfallCard[];
  rankerVersion?: 'baseline' | 'v2';
}

interface UnifiedSearchBarProps {
  onSearch: (
    query: string,
    result?: SearchResult,
    naturalQuery?: string,
    requestId?: string,
  ) => void;
  isLoading: boolean;
  lastTranslatedQuery?: string;
  filters?: FilterState | null;
  /** Phase from the card-fetching layer (TanStack Query) */
  isCardFetching?: boolean;
}

/** Maps a search phase to its display label and icon */
function PhaseIndicator({
  phase,
  isCardFetching,
}: {
  phase: SearchPhase;
  isCardFetching?: boolean;
}) {
  const { t } = useTranslation();
  // 'fetching' phase means translation done, cards loading
  const effectivePhase =
    phase === 'fetching' || (phase === 'idle' && isCardFetching)
      ? 'fetching'
      : phase;
  if (effectivePhase === 'idle') return null;

  const isTranslating = effectivePhase === 'translating';
  const label = isTranslating
    ? t('search.phaseTranslating')
    : t('search.phaseFetching');

  return (
    <div
      className="flex items-center gap-2"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
        {isTranslating ? (
          <>
            <Sparkles className="h-3 w-3 animate-pulse" aria-hidden="true" />
            <span>{t('search.phaseTranslating')}</span>
          </>
        ) : (
          <>
            <Database className="h-3 w-3 animate-pulse" aria-hidden="true" />
            <span>{t('search.phaseFetching')}</span>
          </>
        )}
        <Loader2 className="h-3 w-3 animate-spin ml-0.5" aria-hidden="true" />
      </div>
    </div>
  );
}

export interface UnifiedSearchBarHandle {
  triggerSearch: (
    query: string,
    options?: { bypassCache?: boolean; cacheSalt?: string },
  ) => void;
}

// Ordered so the first four — the only ones visible on mobile — are the
// queries visitors actually run here, taken from analytics. Tested queries
// (`budget board wipes under $5`, `cards that protect my commander`,
// `mana rocks that cost 2`) must remain present so existing suites keep passing.
const EXAMPLE_QUERY_FALLBACKS = [
  'budget board wipes under $5',
  'budget alternatives to Rhystic Study',
  'cards that protect my commander',
  'cheap graveyard hate for EDH',
  'cards that punish treasure decks',
  'cards similar to Seedborn Muse',
  'hidden finishers under $5',
  'mono-white card draw that is not a staple',
  'creatures that reward opponents attacking each other',
  'mana rocks that cost 2',
  'best black removal for commander',
  'sacrifice outlets',
] as const;

export const UnifiedSearchBar = forwardRef<
  UnifiedSearchBarHandle,
  UnifiedSearchBarProps
>(function UnifiedSearchBar(
  { onSearch, isLoading, lastTranslatedQuery, filters, isCardFetching },
  ref,
) {
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const { trackExampleQueryImpression, trackExampleQueryClick } =
    useAnalytics();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const isVoiceSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Auto-focus search input on desktop to encourage immediate search.
  // `preventScroll` keeps the page at the top so the hero and intro sections
  // stay readable instead of the viewport snapping down to the input.
  useEffect(() => {
    if (!isMobile && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus({ preventScroll: true });
      }, 600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isMobile]);

  const placeholder = t('search.placeholder', 'budget board wipes under $5');
  const exampleQueries = EXAMPLE_QUERY_FALLBACKS.map((fallback, index) =>
    t(`search.example${index + 1}`, fallback),
  );
  const [, setShowHistoryDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { saveContext } = useSearchContext();
  const { history, addToHistory } = useSearchHistory();
  const { isSearching, searchPhase, rateLimitCountdown, handleSearch } =
    useSearchHandler({
      query,
      filters,
      onSearch,
      addToHistory,
      saveContext,
    });

  useImperativeHandle(
    ref,
    () => ({
      triggerSearch: (
        searchQuery: string,
        options?: { bypassCache?: boolean; cacheSalt?: string },
      ) => {
        setQuery(searchQuery);
        handleSearch(searchQuery, options);
      },
    }),
    [handleSearch],
  );

  const showExamples = !query;
  const [showAllExamples, setShowAllExamples] = useState(false);

  const collapsedCount = isMobile ? 4 : 6;

  const visibleExamples = useMemo(() => {
    const maxVisible = showAllExamples ? exampleQueries.length : collapsedCount;
    return exampleQueries.slice(0, maxVisible).map((query, position) => ({
      query,
      position,
    }));
  }, [collapsedCount, exampleQueries, showAllExamples]);

  const hasHiddenExamples =
    !showAllExamples && exampleQueries.length > collapsedCount;

  const flattenedVisibleExamples = visibleExamples;

  // One impression per session for the whole surface, not one per chip per
  // render: the per-chip version produced ~6x more impressions than sessions
  // and buried every other signal.
  useEffect(() => {
    if (!showExamples) return;
    if (!markOnce(`search_examples:${isMobile ? 'mobile' : 'desktop'}`)) return;

    trackExampleQueryImpression({
      query: 'search_bar_examples',
      category: 'flat',
      visible_count: flattenedVisibleExamples.length,
      is_mobile: isMobile,
    });
  }, [
    flattenedVisibleExamples.length,
    isMobile,
    showExamples,
    trackExampleQueryImpression,
  ]);

  return (
    <div
      className="w-full space-y-4 px-0"
      role="search"
      aria-label={t('search.label')}
    >
      {/* Search input */}
      <div className="relative space-y-2">
        <div>
          <div
            className={`relative flex items-stretch gap-0 border bg-background/40 transition-colors duration-200 ${
              isFocused ? 'border-foreground/60' : 'border-border'
            }`}
          >
            <label htmlFor="search-input" className="sr-only">
              {t('search.inputLabel')}
            </label>

            <div className="relative flex-1 min-w-0">
              <input
                ref={inputRef}
                id="search-input"
                type="search"
                aria-label={t('search.inputLabel')}
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setShowHistoryDropdown(false);
                    handleSearch();
                  } else if (e.key === 'Escape') {
                    setShowHistoryDropdown(false);
                  }
                }}
                onFocus={() => {
                  setIsFocused(true);
                  if (history.length > 0) {
                    setShowHistoryDropdown(true);
                  }
                }}
                onBlur={(e) => {
                  setIsFocused(false);
                  const relatedTarget = e.relatedTarget as HTMLElement | null;
                  const isDropdownClick = relatedTarget?.closest(
                    '[data-search-history-dropdown="true"]',
                  );
                  if (!isDropdownClick) {
                    setTimeout(() => setShowHistoryDropdown(false), 200);
                  }
                }}
                className="w-full min-w-0 flex-1 bg-transparent px-4 py-4 focus-visible:ring-0 focus-visible:ring-offset-0 text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none sm:px-5 sm:py-5 sm:text-lg"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                aria-describedby="search-hint"
              />
            </div>

            {query && (
              <button
                aria-label={t('search.clear')}
                data-testid="search-clear-button"
                className="flex min-h-[36px] min-w-[36px] flex-shrink-0 items-center justify-center self-center p-2 text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}

            {isVoiceSupported && (
              <Suspense fallback={null}>
                <VoiceSearchControl
                  className="h-9 w-9 self-center sm:h-10 sm:w-10"
                  onTranscript={(transcript) => {
                    setQuery(transcript);
                  }}
                  onFinalTranscript={(transcript) => {
                    setQuery(transcript);
                    handleSearch(transcript);
                  }}
                />
              </Suspense>
            )}

            <button
              type="button"
              onClick={() => handleSearch()}
              disabled={
                isSearching ||
                isLoading ||
                !query.trim() ||
                rateLimitCountdown > 0
              }
              className="flex flex-shrink-0 items-center gap-2 border-l border-border bg-foreground px-5 font-mono text-[11px] uppercase tracking-[0.24em] text-background transition-opacity hover:opacity-85 disabled:opacity-40 sm:px-7"
              data-testid="search-submit-button"
              aria-label={
                rateLimitCountdown > 0
                  ? t('search.waitSeconds').replace(
                      '{seconds}',
                      String(rateLimitCountdown),
                    )
                  : isSearching
                    ? t('search.searching')
                    : t('search.searchForCards')
              }
            >
              {rateLimitCountdown > 0 ? (
                <>
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{rateLimitCountdown}s</span>
                </>
              ) : isSearching ? (
                <Loader2
                  className="h-3.5 w-3.5 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <>
                  <Search
                    className="h-3.5 w-3.5 sm:hidden"
                    aria-hidden="true"
                  />
                  <span className="hidden sm:inline">
                    {t('search.button')} →
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Auxiliary actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Suspense fallback={null}>
            <SearchFeedback
              originalQuery={query}
              translatedQuery={lastTranslatedQuery}
            />
            <SearchHelpModal
              onTryExample={(exampleQuery) => {
                setQuery(exampleQuery);
                handleSearch(exampleQuery);
              }}
            />
          </Suspense>
        </div>

        <p id="search-hint" className="sr-only">
          {t('search.hint')}
        </p>
      </div>

      {/* Progressive loading phase indicator */}
      <PhaseIndicator phase={searchPhase} isCardFetching={isCardFetching} />

      {/* Example queries - shown when no query typed */}
      {showExamples && (
        <div
          className="flex flex-wrap items-baseline gap-x-5 gap-y-2"
          role="group"
          aria-label={t('search.trySearchingFor')}
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
            {t('search.trySearchingFor')} →
          </span>
          {visibleExamples.map(({ query: example, position }) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                trackExampleQueryClick({
                  query: example,
                  category: 'flat',
                  position,
                  visible_count: flattenedVisibleExamples.length,
                  is_mobile: isMobile,
                });
                setQuery(example);
                handleSearch(example);
              }}
              className="focus-ring font-mono text-[11px] lowercase tracking-[0.06em] text-muted-foreground underline decoration-border underline-offset-[6px] transition-colors hover:text-foreground hover:decoration-foreground"
              aria-label={t('search.searchFor').replace('{query}', example)}
            >
              {example}
            </button>
          ))}
          {hasHiddenExamples && (
            <button
              type="button"
              onClick={() => setShowAllExamples(true)}
              className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent transition-colors hover:text-accent/80"
            >
              {t('search.moreExamples', 'More')} ▾
            </button>
          )}
        </div>
      )}
    </div>
  );
});
