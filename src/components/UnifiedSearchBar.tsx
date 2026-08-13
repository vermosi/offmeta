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
import { Button } from '@/components/ui/button';
import { Search, Loader2, X, Clock, Sparkles, Database } from 'lucide-react';
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
import { useTranslation } from '@/lib/i18n';

const SearchCountBadge = lazy(() =>
  import('@/components/SearchCountBadge').then((m) => ({
    default: m.SearchCountBadge,
  })),
);
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
}

interface UnifiedSearchBarProps {
  onSearch: (
    query: string,
    result?: SearchResult,
    naturalQuery?: string,
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
      className="flex items-center justify-center gap-2 animate-fade-in"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-300 ${
          isTranslating
            ? 'bg-primary/10 border-primary/20 text-primary'
            : 'bg-accent/10 border-accent/20 text-accent-foreground'
        }`}
      >
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

// Ordered to lead with discovery-flavored queries (see docs/product-audit.md).
// Tested queries — `budget board wipes under $5`, `cards that protect my commander`,
// `mana rocks that cost 2` — must remain present so existing suites keep passing.
const EXAMPLE_QUERIES = [
  'cards that punish treasure decks',
  'budget alternatives to Rhystic Study',
  'cards similar to Seedborn Muse',
  'hidden finishers under $5',
  'budget board wipes under $5',
  'cards that protect my commander',
  'mono-white card draw that is not a staple',
  'creatures that reward opponents attacking each other',
  'cheap graveyard hate for EDH',
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

  const placeholder = 'budget board wipes under $5';
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
    const maxVisible = showAllExamples
      ? EXAMPLE_QUERIES.length
      : collapsedCount;
    return EXAMPLE_QUERIES.slice(0, maxVisible).map((query, position) => ({
      query,
      position,
    }));
  }, [collapsedCount, showAllExamples]);

  const hasHiddenExamples =
    !showAllExamples && EXAMPLE_QUERIES.length > collapsedCount;


  const flattenedVisibleExamples = visibleExamples;

  useEffect(() => {
    if (!showExamples) return;

    flattenedVisibleExamples.forEach(
      ({ query: example, position }) => {
        const impressionKey = `offmeta_example_impression:${example}:${isMobile ? 'mobile' : 'desktop'}`;
        if (sessionStorage.getItem(impressionKey)) return;

        sessionStorage.setItem(impressionKey, '1');
        trackExampleQueryImpression({
          query: example,
          category: 'flat',
          position,
          visible_count: flattenedVisibleExamples.length,
          is_mobile: isMobile,
        });
      },
    );
  }, [
    flattenedVisibleExamples,
    isMobile,
    showExamples,
    trackExampleQueryImpression,
  ]);

  return (
    <div
      className="space-y-4 sm:space-y-6 w-full mx-auto px-0 animate-fade-in"
      style={{
        maxWidth: 'clamp(320px, 90vw, 840px)',
        animationDuration: '0.5s',
        animationDelay: '0.15s',
        animationFillMode: 'backwards',
      }}
      role="search"
      aria-label={t('search.label')}
    >
      {/* Search input */}
      <div className="relative space-y-2">
        <div className={`gradient-border-wrap ${isFocused ? 'opacity-100' : 'opacity-60 hover:opacity-80'} transition-opacity duration-300`}>
          <div
            className={`
              relative flex items-center gap-1.5 sm:gap-2 rounded-3xl border border-border/60 bg-gradient-to-r from-card/95 via-background/85 to-card/95 p-1.5 shadow-sm transition-all duration-300 sm:p-2
              transition-all duration-300
              ${
                isFocused
                  ? 'shadow-xl shadow-accent/10'
                  : 'shadow-sm'
              }
            `}
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
                className="flex-1 min-w-0 w-full bg-transparent text-base sm:text-lg text-foreground placeholder:text-muted-foreground focus:outline-none py-3 px-3 sm:px-2"
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
                className="flex min-h-[36px] min-w-[36px] flex-shrink-0 items-center justify-center rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
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
                  className="h-9 w-9 sm:h-10 sm:w-10"
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

            <Button
              onClick={() => handleSearch()}
              disabled={
                isSearching ||
                isLoading ||
                !query.trim() ||
                rateLimitCountdown > 0
              }
              variant="accent"
              size="sm"
              className="h-10 flex-shrink-0 gap-2 rounded-full px-4 font-medium shadow-lg shadow-accent/20 sm:h-12 sm:px-5"
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
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  <span className="text-xs">{rateLimitCountdown}s</span>
                </>
              ) : isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <>
                  <Search className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{t('search.button')}</span>
                </>
              )}
            </Button>

            {/* Desktop-only inline buttons */}
            <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
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
          </div>
        </div>

        {/* Secondary row: Mobile-only auxiliary actions */}
        <div className="flex sm:hidden items-center justify-center gap-2 flex-wrap">
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

      {/* Trust signals — compact single line, only on landing */}
      {showExamples && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground/70">
          <span>✦ Free to use</span>
          <span>✦ Powered by Scryfall</span>
          <span>✦ No account required</span>
          <Suspense fallback={null}>
            <SearchCountBadge />
          </Suspense>
        </div>
      )}

      {/* Progressive loading phase indicator */}
      <PhaseIndicator phase={searchPhase} isCardFetching={isCardFetching} />

      {/* Example queries - shown when no query typed */}
      {showExamples && (
        <div
          className="animate-reveal flex flex-wrap items-center justify-center gap-x-2 gap-y-2"
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
              className="focus-ring rounded-full border border-border/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-accent/50 hover:bg-accent/10 hover:text-foreground"
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
              More ▾
            </button>
          )}
        </div>
      )}

    </div>
  );
});
