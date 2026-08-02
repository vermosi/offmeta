/**
 * Toolbar shown above search results: a single glass "instrument panel" bar.
 * Row 1 — left: query refinement (format, filters, sort) and view toggle;
 *         right: result count and output actions (share, stats, export).
 * Row 2 — the generated Scryfall query as an inline, expandable strip.
 * Collapses to a compact single row with an overflow menu on mobile.
 * @module components/ResultsToolbar
 */

import type { ReactNode } from 'react';
import { SearchFilters } from '@/components/SearchFilters';
import { ViewToggle } from '@/components/ViewToggle';
import { ExportResults } from '@/components/ExportResults';
import { ShareSearchButton } from '@/components/ShareSearchButton';
import { ResultsStats } from '@/components/ResultsStats';
import { MoreHorizontal } from 'lucide-react';
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
  collectionLookup?: Map<string, number> | undefined;
  onFilteredCards: (cards: ScryfallCard[], hasActiveFilters: boolean, filters: FilterState) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  pendingFilterOverride?: Partial<FilterState> | null;
  filterOverrideKey?: number;
  /** Expandable Scryfall query strip rendered inside the toolbar. */
  queryStrip?: ReactNode;
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
  pendingFilterOverride,
  filterOverrideKey,
  queryStrip,
}: ResultsToolbarProps) {
  const { t } = useTranslation();

  const countLabel =
    displayCards.length < totalCards
      ? `${displayCards.length.toLocaleString()} / ${totalCards.toLocaleString()}`
      : totalCards.toLocaleString();

  return (
    <div className="animate-reveal rounded-2xl border border-border/50 bg-card/40 p-1.5 shadow-lg backdrop-blur-2xl">
      {/* Row 1 — controls */}
      <div className="flex flex-wrap items-center gap-1.5 px-0.5 sm:flex-nowrap">
        {/* Refinement group: format · filters · sort */}
        <div className="flex min-w-0 items-center gap-1.5">
          <SearchFilters
            cards={cards}
            onFilteredCards={onFilteredCards}
            totalCards={totalCards}
            resetKey={filtersResetKey}
            initialFilters={initialUrlFilters}
            collectionLookup={collectionLookup}
            pendingOverride={pendingFilterOverride}
            overrideKey={filterOverrideKey}
          />
        </div>

        <div
          className="hidden h-6 w-px shrink-0 bg-border/70 sm:block"
          aria-hidden="true"
        />

        {/* Presentation */}
        <ViewToggle value={viewMode} onChange={onViewModeChange} />

        <div className="flex-1" />

        {/* Output group: count · share · stats · export */}
        <div className="flex items-center gap-1.5">
          {totalCards > 0 && (
            <span
              className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              {countLabel}
            </span>
          )}

          <div
            className="hidden h-6 w-px shrink-0 bg-border/70 sm:block"
            aria-hidden="true"
          />

          <div className="hidden items-center gap-1 sm:flex">
            <ShareSearchButton />
            <ResultsStats cards={displayCards} />
            <ExportResults cards={displayCards} />
          </div>

          {/* Mobile overflow */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground sm:hidden"
                aria-label={t('common.moreOptions', 'More options')}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto border border-border bg-popover p-1.5 shadow-lg"
              align="end"
              sideOffset={4}
            >
              <div className="flex items-center gap-1">
                <ShareSearchButton />
                <ResultsStats cards={displayCards} />
                <ExportResults cards={displayCards} />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Row 2 — generated Scryfall query */}
      {queryStrip && <div className="mt-1.5">{queryStrip}</div>}
    </div>
  );
}
