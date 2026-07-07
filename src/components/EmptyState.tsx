import { SearchX, Lightbulb, RefreshCw, Sparkles, Loader2, X, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { type QuerySuggestion } from '@/hooks';
import type { FilterState } from '@/types/filters';

interface EmptyStateProps {
  query?: string;
  onTryExample?: (query: string) => void;
  suggestions?: QuerySuggestion[];
  isCheckingSuggestions?: boolean;
  onTrySuggestion?: (scryfallQuery: string) => void;
  /** Snapshot of the last applied filters — drives the summary chips. */
  activeFilters?: FilterState | null;
  /** Patch one or more filter values. Used by the X on each chip to broaden. */
  onApplyFilterPatch?: (patch: Partial<FilterState>) => void;
  /** Clear every filter back to defaults. */
  onClearAllFilters?: () => void;
  /** Distinguish "server returned 0" (default) from "filters hid everything". */
  variant?: 'server' | 'filtered';
  /** Count of server-side results before client filters, when known. */
  filteredFromCount?: number;
}

// Labels for common sort keys → i18n keys defined in SearchFilters.
const SORT_LABEL_KEYS: Record<string, string> = {
  'name-asc': 'filters.sortNameAsc',
  'name-desc': 'filters.sortNameDesc',
  'cmc-asc': 'filters.sortCmcAsc',
  'cmc-desc': 'filters.sortCmcDesc',
  'price-asc': 'filters.sortPriceAsc',
  'price-desc': 'filters.sortPriceDesc',
  'rarity-asc': 'filters.sortRarityAsc',
  'rarity-desc': 'filters.sortRarityDesc',
  'edhrec-asc': 'filters.sortEdhrecAsc',
  'edhrec-desc': 'filters.sortEdhrecDesc',
};

const FORMAT_LABEL: Record<string, string> = {
  commander: 'Commander',
  modern: 'Modern',
  standard: 'Standard',
  pioneer: 'Pioneer',
  pauper: 'Pauper',
  legacy: 'Legacy',
  vintage: 'Vintage',
  premodern: 'Premodern',
  historic: 'Historic',
  explorer: 'Explorer',
  timeless: 'Timeless',
  duel: 'Duel Commander',
  penny: 'Penny Dreadful',
  oathbreaker: 'Oathbreaker',
  paupercommander: 'Pauper Commander',
  brawl: 'Brawl',
};

const COLOR_LABEL: Record<string, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
  C: 'Colorless',
};

interface Chip {
  key: string;
  label: string;
  patch: Partial<FilterState>;
}

function buildAppliedChips(
  filters: FilterState | null | undefined,
): Chip[] {
  if (!filters) return [];
  const chips: Chip[] = [];

  if (filters.format) {
    chips.push({
      key: `format-${filters.format}`,
      label: `Format: ${FORMAT_LABEL[filters.format] ?? filters.format}`,
      patch: { format: undefined },
    });
  }
  filters.colors.forEach((c) => {
    chips.push({
      key: `color-${c}`,
      label: COLOR_LABEL[c] ?? c,
      patch: { colors: filters.colors.filter((x) => x !== c) },
    });
  });
  filters.types.forEach((t) => {
    chips.push({
      key: `type-${t}`,
      label: t,
      patch: { types: filters.types.filter((x) => x !== t) },
    });
  });
  const [minCmc, maxCmc] = filters.cmcRange;
  if (minCmc > 0 || maxCmc < 16) {
    chips.push({
      key: 'cmc',
      label: `CMC ${minCmc}–${maxCmc}`,
      patch: { cmcRange: [0, 16] },
    });
  }
  if (filters.ownedOnly) {
    chips.push({
      key: 'ownedOnly',
      label: 'Owned only',
      patch: { ownedOnly: false },
    });
  }
  if (filters.sortBy && filters.sortBy !== 'name-asc') {
    chips.push({
      key: `sort-${filters.sortBy}`,
      // Sort chip label rendered separately via t() in the JSX (kept generic here).
      label: `Sort: ${filters.sortBy}`,
      patch: { sortBy: 'name-asc' },
    });
  }
  return chips;
}

export const EmptyState = ({
  query,
  onTryExample,
  suggestions,
  isCheckingSuggestions,
  onTrySuggestion,
  activeFilters,
  onApplyFilterPatch,
  onClearAllFilters,
  variant = 'server',
  filteredFromCount,
}: EmptyStateProps) => {
  const { t } = useTranslation();

  const tips = [
    t('empty.tip1'),
    t('empty.tip2'),
    t('empty.tip3'),
    t('empty.tip4'),
  ];

  const exampleQueries = [
    t('empty.example1'),
    t('empty.example2'),
    t('empty.example3'),
    t('empty.example4'),
  ];

  const hasSuggestions = suggestions && suggestions.length > 0;
  const appliedChips = buildAppliedChips(activeFilters);
  const hasAppliedFilters = appliedChips.length > 0;

  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center py-16 sm:py-20 px-4 text-center animate-reveal"
    >
      <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-secondary flex items-center justify-center mb-5">
        <SearchX className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground" />
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">
        {variant === 'filtered'
          ? t('empty.filtersHideAll', 'Filters hid every result')
          : t('empty.noCards')}
      </h3>

      {query && (
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          {variant === 'filtered' && typeof filteredFromCount === 'number' ? (
            <>
              {t(
                'empty.filteredFromCount',
                'None of the {count} matches pass your active filters.',
              ).replace('{count}', filteredFromCount.toLocaleString())}
            </>
          ) : (
            <>
              {t('empty.noMatch')} "
              <span className="font-medium text-foreground">{query}</span>"
            </>
          )}
        </p>
      )}

      {/* Applied filters summary + broaden chips */}
      {hasAppliedFilters && (
        <div className="surface-elevated p-5 max-w-md w-full mb-6 text-left">
          <div className="flex items-center gap-2 mb-3">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {t('empty.appliedFilters', 'Applied filters & sort')}
            </span>
            {onClearAllFilters && (
              <button
                type="button"
                onClick={onClearAllFilters}
                className="ml-auto text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {t('empty.clearAllFilters', 'Clear all')}
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {appliedChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => onApplyFilterPatch?.(chip.patch)}
                disabled={!onApplyFilterPatch}
                aria-label={`${t('empty.removeFilter', 'Remove filter')}: ${
                  chip.key.startsWith('sort-')
                    ? t(SORT_LABEL_KEYS[activeFilters!.sortBy] ?? '', chip.label)
                    : chip.label
                }`}
                className="group inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full
                  bg-secondary text-secondary-foreground text-xs font-medium
                  border border-border/60 hover:border-primary/40 hover:bg-primary/5
                  transition-colors disabled:opacity-70 disabled:cursor-default"
              >
                <span className="min-w-0 truncate max-w-[160px]">
                  {chip.key.startsWith('sort-')
                    ? `${t('empty.sortLabel', 'Sort')}: ${t(
                        SORT_LABEL_KEYS[activeFilters!.sortBy] ?? '',
                        activeFilters!.sortBy,
                      )}`
                    : chip.label}
                </span>
                {onApplyFilterPatch && (
                  <span
                    aria-hidden="true"
                    className="inline-flex items-center justify-center h-4 w-4 rounded-full
                      text-muted-foreground group-hover:text-primary
                      group-hover:bg-primary/10 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground">
            {t(
              'empty.filtersHint',
              'Tap a chip to remove that filter and broaden the search.',
            )}
          </p>
        </div>
      )}

      {/* Did you mean? suggestions */}
      {(hasSuggestions || isCheckingSuggestions) && (
        <div className="surface-elevated p-5 max-w-md w-full mb-6 text-left">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {t('empty.didYouMean')}
            </span>
            {isCheckingSuggestions && !hasSuggestions && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />
            )}
          </div>

          {hasSuggestions && (
            <div className="space-y-2">
              {suggestions!.map((s) => (
                <button
                  key={s.query}
                  type="button"
                  onClick={() => onTrySuggestion?.(s.query)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg
                    bg-primary/5 hover:bg-primary/10 border border-primary/10 hover:border-primary/20
                    transition-colors text-left group"
                >
                  <div className="min-w-0">
                    <code className="text-xs font-mono text-foreground break-all leading-relaxed">
                      {s.query}
                    </code>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {s.label}
                      {s === suggestions![0] ? ' • Best match' : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-primary/70 group-hover:text-primary tabular-nums">
                    {t('empty.cardCount').replace('{count}', s.totalCards.toLocaleString())}
                  </span>
                </button>
              ))}
            </div>
          )}

          {isCheckingSuggestions && !hasSuggestions && (
            <p className="text-xs text-muted-foreground">
              {t('empty.checkingAlternatives')}
            </p>
          )}
        </div>
      )}

      {/* Tips section */}
      <div className="surface-elevated p-5 max-w-md w-full mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium text-foreground">
            {t('empty.tips')}
          </span>
        </div>
        <ul className="text-sm text-muted-foreground space-y-2 text-left">
          {tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-accent mt-0.5">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Example queries */}
      {onTryExample && (
        <div className="w-full max-w-md">
          <p className="text-xs text-muted-foreground mb-3 flex items-center justify-center gap-1.5">
            <RefreshCw className="h-3 w-3" />
            {t('empty.tryOne')}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {exampleQueries.map((example) => (
              <Button
                key={example}
                variant="outline"
                size="sm"
                type="button"
                onClick={() => onTryExample(example)}
                className="text-xs magnetic"
              >
                {example}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
