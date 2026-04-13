/**
 * Toolbar row shown above search results: filters, view toggle,
 * compare mode, share, export, and result stats.
 * @module components/ResultsToolbar
 */

import { SearchFilters } from '@/components/SearchFilters';
import { ViewToggle } from '@/components/ViewToggle';
import { ExportResults } from '@/components/ExportResults';
import { ShareSearchButton } from '@/components/ShareSearchButton';
import { ResultsStats } from '@/components/ResultsStats';
import { GitCompareArrows } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { ScryfallCard } from '@/types/card';
import type { FilterState } from '@/types/filters';
import type { ViewMode } from '@/lib/view-mode-storage';

interface ResultsToolbarProps {
  cards: ScryfallCard[];
  displayCards: ScryfallCard[];
  totalCards: number;
  activeFilters: FilterState | null;
  filtersResetKey: number;
  initialUrlFilters: Partial<FilterState> | null | undefined;
  collectionLookup: Map<string, number> | undefined;
  onFilteredCards: (cards: ScryfallCard[], hasActiveFilters: boolean, filters: FilterState) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  compareMode: boolean;
  onToggleCompareMode: () => void;
}

export function ResultsToolbar({
  cards,
  displayCards,
  totalCards,
  filtersResetKey,
  initialUrlFilters,
  collectionLookup,
  onFilteredCards,
  viewMode,
  onViewModeChange,
  compareMode,
  onToggleCompareMode,
}: ResultsToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="animate-reveal space-y-2">
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        <SearchFilters
          cards={cards}
          onFilteredCards={onFilteredCards}
          totalCards={totalCards}
          resetKey={filtersResetKey}
          initialFilters={initialUrlFilters}
          collectionLookup={collectionLookup}
        />
        <ViewToggle value={viewMode} onChange={onViewModeChange} />

        {/* Compare mode toggle */}
        <button
          onClick={onToggleCompareMode}
          className={`flex items-center gap-1 py-1 px-2.5 text-xs rounded-md transition-colors ${
            compareMode
              ? 'bg-primary/10 text-primary border border-primary/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
          aria-pressed={compareMode}
          aria-label={t('compare.label')}
        >
          <GitCompareArrows className="h-3.5 w-3.5" />
          <span>{t('compare.label')}</span>
        </button>

        <div className="flex-1" />

        {totalCards > 0 && (
          <span
            className="text-[11px] sm:text-xs text-muted-foreground tabular-nums flex-shrink-0"
            role="status"
            aria-live="polite"
          >
            {displayCards.length < totalCards
              ? `${displayCards.length.toLocaleString()} / ${totalCards.toLocaleString()}`
              : totalCards.toLocaleString()}{' '}
            {t('a11y.cardsCount').replace('{count}', '').trim()}
          </span>
        )}
        <ShareSearchButton />
        <ExportResults cards={displayCards} />
        <ResultsStats cards={displayCards} />
      </div>
    </div>
  );
}
