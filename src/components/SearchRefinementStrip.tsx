/**
 * Compact refinement strip for search results.
 * Surfaces active filter chips and a few fast follow-up refinements so users
 * can iteratively narrow or broaden results without retyping the whole query.
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { KeyboardEvent } from 'react';
import { useTranslation } from '@/lib/i18n';
import type { FilterState } from '@/types/filters';

const COLOR_NAMES: Record<string, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
  C: 'Colorless',
};

const QUICK_REFINEMENTS = [
  { label: 'Commander', token: 'f:commander' },
  { label: 'Modern', token: 'f:modern' },
  { label: 'Creatures', token: 't:creature' },
  { label: 'Instants', token: 't:instant' },
  { label: 'Artifacts', token: 't:artifact' },
  { label: 'Removal', token: 'otag:removal' },
  { label: 'Ramp', token: 'otag:ramp' },
  { label: 'Budget', token: 'usd<5' },
] as const;

interface SearchRefinementStripProps {
  originalQuery: string;
  searchQuery: string;
  activeFilters: FilterState | null;
  onRefineQuery: (nextQuery: string) => void;
  onRemoveFilter: (patch: Partial<FilterState>) => void;
  onClearAllFilters: () => void;
}

export function SearchRefinementStrip({
  originalQuery,
  searchQuery,
  activeFilters,
  onRefineQuery,
  onRemoveFilter,
  onClearAllFilters,
}: SearchRefinementStripProps) {
  const { t } = useTranslation();
  const queryBase = searchQuery.trim() || originalQuery.trim();

  const activeChips = [
    activeFilters?.format
      ? {
          key: 'format',
          label: activeFilters.format,
          onRemove: () => onRemoveFilter({ format: undefined }),
        }
      : null,
    ...(activeFilters?.colors ?? []).map((color) => ({
      key: `color:${color}`,
      label: COLOR_NAMES[color] ?? color,
      onRemove: () =>
        onRemoveFilter({
          colors:
            activeFilters?.colors.filter((current) => current !== color) ?? [],
        }),
    })),
    ...(activeFilters?.types ?? []).map((type) => ({
      key: `type:${type}`,
      label: type,
      onRemove: () =>
        onRemoveFilter({
          types:
            activeFilters?.types.filter((current) => current !== type) ?? [],
        }),
    })),
    activeFilters?.cmcRange &&
    (activeFilters.cmcRange[0] > 0 || activeFilters.cmcRange[1] < 16)
      ? {
          key: 'cmc',
          label: `CMC ${activeFilters.cmcRange[0]}-${activeFilters.cmcRange[1]}`,
          onRemove: () => onRemoveFilter({ cmcRange: [0, 16] }),
        }
      : null,
    activeFilters?.ownedOnly
      ? {
          key: 'ownedOnly',
          label: 'Owned only',
          onRemove: () => onRemoveFilter({ ownedOnly: false }),
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    onRemove: () => void;
  }>;

  if (!queryBase && activeChips.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-border/70 bg-card/70 backdrop-blur-sm px-3 py-3 sm:px-4 sm:py-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t('filters.label', 'Refine')}
          </span>
          <span className="text-xs text-muted-foreground">
            {t(
              'results.refineHint',
              'Tighten the search with tags or quick chips.',
            )}
          </span>
        </div>

        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeChips.map((chip) => (
              <Badge
                key={chip.key}
                variant="secondary"
                className="cursor-pointer gap-1 pr-1.5 text-xs hover:bg-destructive/15"
                onClick={chip.onRemove}
                role="button"
                tabIndex={0}
                onKeyDown={(e: KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    chip.onRemove();
                  }
                }}
              >
                {chip.label}
              </Badge>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearAllFilters}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear filters
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {QUICK_REFINEMENTS.map((item) => (
            <button
              key={item.token}
              type="button"
              onClick={() => {
                const exists = queryBase
                  .split(/\s+/)
                  .some(
                    (part) => part.toLowerCase() === item.token.toLowerCase(),
                  );
                if (exists) return;
                onRefineQuery(
                  queryBase ? `${queryBase} ${item.token}` : item.token,
                );
              }}
              className="rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
            >
              + {item.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
