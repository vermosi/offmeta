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
import {
  Search,
  Loader2,
  X,
  Clock,
  Sparkles,
  Database,
  ShieldCheck,
  Globe,
  BadgeDollarSign,
} from 'lucide-react';
import { SearchHistoryDropdown } from '@/components/SearchHistoryDropdown';
import { useIsMobile } from '@/hooks/useMobile';
const SearchFeedback = lazy(() =>
  import('@/components/SearchFeedback').then((m) => ({
    default: m.SearchFeedback,
  })),
);
const SearchHelpModal = lazy(() =>
  import('@/components/SearchHelpModal').then((m) => ({
    default: m.SearchHelpModal,
  })),
);
import { VoiceSearchButton } from '@/components/VoiceSearchButton';
import type { FilterState } from '@/types/filters';
import { useTypingPlaceholder } from '@/hooks/useTypingPlaceholder';
import type { SearchIntent } from '@/types/search';
import { useSearchContext } from '@/hooks/useSearchContext';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useSearchHandler, type SearchPhase } from '@/hooks/useSearchHandler';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useTranslation } from '@/lib/i18n';

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

const EXAMPLE_QUERY_GROUPS = [
  {
    category: 'Budget',
    queries: [
      'find budget board wipes under $5',
      'cheap white protection spells',
    ],
  },
  {
    category: 'Commander',
    queries: [
      'cards that protect my commander',
      'cheap graveyard hate for EDH',
    ],
  },
  {
    category: 'Tribal',
    queries: [
      'elf lords that buff other elves',
      'best zombie tribal payoffs',
    ],
  },
  {
    category: 'Combo',
    queries: [
      'infinite mana combos in green',
      'cards that go infinite with sacrifice',
    ],
  },
  {
    category: 'Staples',
    queries: ['mana rocks that cost 2', 'best black removal for commander'],
  },
  {
    category: 'Synergy',
    queries: [
      'cards that double ETB triggers',
      'one-card combos in Simic colors',
    ],
  },
] as const;

const TRUST_SIGNALS = [
  { icon: BadgeDollarSign, label: 'Free to use' },
  { icon: Database, label: 'Powered by Scryfall' },
  { icon: ShieldCheck, label: 'No account required' },
  { icon: Globe, label: '11-language support' },
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

  const {
    placeholder,
    typingText,
    isAnimating: isTyping,
    stop: stopTyping,
  } = useTypingPlaceholder('', !query && !isFocused);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { saveContext } = useSearchContext();
  const { history, addToHistory, removeFromHistory, clearHistory } =
    useSearchHistory();
  const { isSearching, searchPhase, rateLimitCountdown, handleSearch } =
    useSearchHandler({
      query,
      filters,
      onSearch,
      addToHistory,
      saveContext,
    });

  const {
    isListening,
    isSupported: isVoiceSupported,
    startListening,
    stopListening,
  } = useVoiceInput({
    onFinalTranscript: (transcript) => {
      setQuery(transcript);
      handleSearch(transcript);
    },
    onTranscript: (transcript) => {
      setQuery(transcript);
    },
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
  const visibleExamples = useMemo(() => {
    const maxExamples = isMobile ? 5 : Number.POSITIVE_INFINITY;

    return EXAMPLE_QUERY_GROUPS.reduce<
      Array<{ category: string; queries: readonly string[] }>
    >((groups, { category, queries }) => {
      const shownCount = groups.reduce(
        (count, group) => count + group.queries.length,
        0,
      );

      if (shownCount >= maxExamples) {
        return groups;
      }

      const remainingSlots = maxExamples - shownCount;
      const visibleQueries = queries.slice(0, remainingSlots);

      if (visibleQueries.length === 0) {
        return groups;
      }

      return [...groups, { category, queries: visibleQueries }];
    }, []);
  }, [isMobile]);

  const flattenedVisibleExamples = useMemo(
    () =>
      visibleExamples.flatMap(({ category, queries }) =>
        queries.map((example, position) => ({
          category,
          query: example,
          position,
        })),
      ),
    [visibleExamples],
  );

  useEffect(() => {
    if (!showExamples) return;

    flattenedVisibleExamples.forEach(
      ({ query: example, category, position }) => {
        const impressionKey = `offmeta_example_impression:${category}:${example}:${isMobile ? 'mobile' : 'desktop'}`;
        if (sessionStorage.getItem(impressionKey)) return;

        sessionStorage.setItem(impressionKey, '1');
        trackExampleQueryImpression({
          query: example,
          category,
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
        <SearchHistoryDropdown
          history={history}
          open={showHistoryDropdown}
          onOpenChange={setShowHistoryDropdown}
          onSelectQuery={(selectedQuery) => {
            setQuery(selectedQuery);
            setShowHistoryDropdown(false);
            handleSearch(selectedQuery);
          }}
          onRemoveQuery={removeFromHistory}
          onClearAll={() => {
            clearHistory();
            setShowHistoryDropdown(false);
          }}
        >
          <div
            className={`
              relative flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-xl border bg-card
              transition-all duration-200
              ${
                isFocused
                  ? 'border-foreground/20 shadow-lg ring-2 ring-ring ring-offset-2 ring-offset-background'
                  : 'border-border shadow-sm hover:border-muted-foreground/30 hover:shadow-md'
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
                  stopTyping();
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
                className="flex-1 min-w-0 w-full bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none py-2 px-2 sm:px-1"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                aria-describedby="search-hint"
              />

              {!query && !isFocused && isTyping && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-2 sm:left-1 right-2 flex items-center text-sm sm:text-base text-muted-foreground"
                >
                  <span className="truncate">
                    {typingText || '\u200B'}
                    <span className="inline-block w-[2px] h-4 bg-accent/70 ml-0.5 align-middle animate-pulse" />
                  </span>
                </div>
              )}
            </div>

            {query && (
              <button
                aria-label={t('search.clear')}
                data-testid="search-clear-button"
                className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-muted-foreground hover:text-foreground flex-shrink-0 rounded-lg hover:bg-secondary transition-colors"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}

            <VoiceSearchButton
              isListening={isListening}
              isSupported={isVoiceSupported}
              onToggle={isListening ? stopListening : startListening}
              className="h-9 w-9 sm:h-10 sm:w-10"
            />

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
              className="h-9 sm:h-10 px-3 sm:px-4 rounded-lg gap-1.5 sm:gap-2 font-medium flex-shrink-0"
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
                  originalQuery={query || history[0] || ''}
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
        </SearchHistoryDropdown>

        {/* Secondary row: Mobile-only auxiliary actions */}
        <div className="flex sm:hidden items-center justify-center gap-2 flex-wrap">
          <Suspense fallback={null}>
            <SearchFeedback
              originalQuery={query || history[0] || ''}
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

      <div className="space-y-2 text-center">
        <p className="text-sm text-muted-foreground">
          Search MTG cards in plain English — OffMeta handles the Scryfall
          syntax and returns useful results instantly.
        </p>
        <div
          className="flex flex-wrap items-center justify-center gap-2"
          aria-label="Trust signals"
        >
          {TRUST_SIGNALS.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground"
            >
              <Icon className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Progressive loading phase indicator */}
      <PhaseIndicator phase={searchPhase} isCardFetching={isCardFetching} />

      {/* Example queries - shown when no query typed */}
      {showExamples && (
        <div
          className="animate-reveal rounded-2xl border border-border/60 bg-card/50 p-4 sm:p-5"
          role="group"
          aria-label={t('search.trySearchingFor')}
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
            <span className="text-sm font-semibold text-foreground tracking-wide">
              {t('search.trySearchingFor')}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {visibleExamples.map(({ category, queries }) => (
              <div
                key={category}
                className="flex flex-col gap-2"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-accent">
                  {category}
                </span>
                <div className="flex flex-col gap-1.5">
                  {queries.map((example, i) => (
                    <button
                      key={`${category}-${example}`}
                      type="button"
                      onClick={() => {
                        trackExampleQueryClick({
                          query: example,
                          category,
                          position: i,
                          visible_count: flattenedVisibleExamples.length,
                          is_mobile: isMobile,
                        });
                        setQuery(example);
                        handleSearch(example);
                      }}
                      className="group flex items-start gap-2 text-left px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 focus-ring text-muted-foreground hover:text-foreground border border-transparent hover:border-accent/30 hover:bg-accent/10 hover:translate-x-0.5 active:scale-[0.98]"
                      aria-label={t('search.searchFor').replace(
                        '{query}',
                        example,
                      )}
                    >
                      <Search className="h-3 w-3 mt-0.5 flex-shrink-0 text-accent/40 group-hover:text-accent transition-colors duration-200" aria-hidden="true" />
                      <span className="group-hover:text-foreground transition-colors duration-200">{example}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
