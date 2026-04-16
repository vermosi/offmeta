/**
 * Toolbar row shown above search results: filters, view toggle,
 * compare mode, share, export, and result stats.
 * Compact single-row layout on mobile; secondary actions in overflow menu.
 * @module components/ResultsToolbar
 */

import { SearchFilters } from '@/components/SearchFilters';
import { ViewToggle } from '@/components/ViewToggle';
import { ExportResults } from '@/components/ExportResults';
import { ShareSearchButton } from '@/components/ShareSearchButton';
import { ResultsStats } from '@/components/ResultsStats';
import { GitCompareArrows, MoreHorizontal } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
    <div className="animate-reveal">
      <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
        {/* Primary controls — always visible */}
        <SearchFilters
          cards={cards}
          onFilteredCards={onFilteredCards}
          totalCards={totalCards}
          resetKey={filtersResetKey}
          initialFilters={initialUrlFilters}
          collectionLookup={collectionLookup}
        />
        <ViewToggle value={viewMode} onChange={onViewModeChange} />

        {/* Compare — icon-only on mobile */}
        <button
          onClick={onToggleCompareMode}
          className={`flex items-center gap-1 py-1 px-1.5 sm:px-2.5 text-xs rounded-md transition-colors ${
            compareMode
              ? 'bg-primary/10 text-primary border border-primary/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
          aria-pressed={compareMode}
          aria-label={t('compare.label')}
        >
          <GitCompareArrows className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('compare.label')}</span>
        </button>

        <div className="flex-1" />

        {/* Card count — compact */}
        {totalCards > 0 && (
          <span
            className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0"
            role="status"
            aria-live="polite"
          >
            {displayCards.length < totalCards
              ? `${displayCards.length.toLocaleString()}/${totalCards.toLocaleString()}`
              : totalCards.toLocaleString()}
          </span>
        )}

        {/* Desktop: show actions inline */}
        <div className="hidden sm:flex items-center gap-1">
          <ShareSearchButton />
          <ExportResults cards={displayCards} />
          <ResultsStats cards={displayCards} />
        </div>

        {/* Mobile: overflow menu for secondary actions */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="sm:hidden flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label="More options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-1.5 bg-popover border border-border shadow-lg"
            align="end"
            sideOffset={4}
          >
            <div className="flex items-center gap-1">
              <ShareSearchButton />
              <ExportResults cards={displayCards} />
              <ResultsStats cards={displayCards} />
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
