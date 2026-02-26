/**
 * Unified search bar component for natural language MTG card search.
 * Presentational component — behavior extracted into dedicated hooks.
 */

import {
  useState,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { Button } from '@/components/ui/button';
import { Search, Loader2, X, Clock, Sparkles, Database } from 'lucide-react';
import { SearchHistoryDropdown } from '@/components/SearchHistoryDropdown';
import { useIsMobile } from '@/hooks/useMobile';
import { SearchFeedback } from '@/components/SearchFeedback';
import { SearchHelpModal } from '@/components/SearchHelpModal';
import { VoiceSearchButton } from '@/components/VoiceSearchButton';
import type { FilterState } from '@/types/filters';
import { useTypingPlaceholder } from '@/hooks/useTypingPlaceholder';
import type { SearchIntent } from '@/types/search';
import { useSearchContext } from '@/hooks/useSearchContext';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useSearchHandler, type SearchPhase } from '@/hooks/useSearchHandler';
import { useVoiceInput } from '@/hooks/useVoiceInput';
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

const EXAMPLE_QUERIES = [
  'creatures that make treasure tokens',
  'cheap green ramp spells',
  'artifacts that produce 2 mana',
];

export const UnifiedSearchBar = forwardRef<
  UnifiedSearchBarHandle,
  UnifiedSearchBarProps
>(function UnifiedSearchBar(
  { onSearch, isLoading, lastTranslatedQuery, filters, isCardFetching },
  ref,
) {
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const {
    placeholder: animatedPlaceholder,
    isAnimating: isTyping,
    stop: stopTyping,
  } = useTypingPlaceholder(
    isMobile ? t('search.placeholderMobile') : t('search.placeholder'),
    !query && !isFocused,
  );
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on desktop to reduce friction for first-time visitors
  useEffect(() => {
    if (isMobile || !inputRef.current) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(timer);
  }, [isMobile]);

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

  return (
    <div
      className="space-y-4 sm:space-y-6 w-full mx-auto px-0 animate-fade-in"
      style={{
        maxWidth: 'clamp(320px, 90vw, 672px)',
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

            <div
              className="hidden sm:flex items-center justify-center w-10 h-10 rounded-lg bg-secondary text-muted-foreground flex-shrink-0"
              aria-hidden="true"
            >
              <Search className="h-4 w-4" />
            </div>

            <input
              ref={inputRef}
              id="search-input"
              type="search"
              placeholder={animatedPlaceholder}
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
                const isDropdownClick =
                  relatedTarget?.closest('[role="listbox"]');
                if (!isDropdownClick) {
                  setTimeout(() => setShowHistoryDropdown(false), 200);
                }
              }}
              className={`flex-1 min-w-0 bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none py-2 px-2 sm:px-1 ${isTyping ? 'placeholder:text-foreground/70' : ''}`}
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              aria-describedby="search-hint"
            />

            {query && (
              <button
                aria-label={t('search.clear')}
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
            </div>
          </div>
        </SearchHistoryDropdown>

        {/* Secondary row: Mobile-only auxiliary actions */}
        <div className="flex sm:hidden items-center justify-center gap-2 flex-wrap">
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
          className="flex flex-col items-center gap-2 animate-reveal"
          role="group"
          aria-label={t('search.trySearchingFor')}
        >
          <span className="text-[11px] text-muted-foreground/60 uppercase tracking-wider font-medium">
            {t('search.trySearchingFor')}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            {EXAMPLE_QUERIES.slice(0, isMobile ? 2 : 3).map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setQuery(example);
                  handleSearch(example);
                }}
                className="px-3.5 py-2 rounded-full text-xs text-muted-foreground hover:text-foreground border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 focus-ring"
                aria-label={t('search.searchFor').replace('{query}', example)}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
