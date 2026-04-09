/**
 * Post-search filters and sort options for card results.
 * Provides format legality, color filters, type filters, CMC range, and sorting.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { ScryfallCard } from '@/types/card';
import type { FilterState } from '@/types/filters';
import { cn } from '@/lib/core/utils';
import { Filter, ArrowUpDown, X, ChevronDown, Package, Shield } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/hooks';
import { useSearchFilterState } from '@/components/SearchFilters/useSearchFilterState';
import {
  applyCardFilters,
  countActiveFilters,
  hasActiveFilters as getHasActiveFilters,
} from '@/components/SearchFilters/filtering';

// Color definitions with mana symbols
const COLORS = [
  { id: 'W', name: 'White' },
  { id: 'U', name: 'Blue' },
  { id: 'B', name: 'Black' },
  { id: 'R', name: 'Red' },
  { id: 'G', name: 'Green' },
  { id: 'C', name: 'Colorless' },
] as const;

const COLOR_IDENTITY_STYLES: Record<(typeof COLORS)[number]['id'], string> = {
  W: 'data-[identity=W]:font-semibold data-[identity=W]:tracking-tight',
  U: 'data-[identity=U]:italic',
  B: 'data-[identity=B]:font-black',
  R: 'data-[identity=R]:uppercase',
  G: 'data-[identity=G]:font-semibold',
  C: 'data-[identity=C]:font-medium data-[identity=C]:text-[11px]',
};

const getColorFilterButtonClass = (
  isSelected: boolean,
  colorId: (typeof COLORS)[number]['id'],
) =>
  cn(
    'h-8 w-8 rounded-full border flex items-center justify-center text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    COLOR_IDENTITY_STYLES[colorId],
    isSelected
      ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-110'
      : 'bg-muted text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground hover:border-accent-foreground/20',
  );

// Card types to filter by
const CARD_TYPES = [
  'Creature',
  'Instant',
  'Sorcery',
  'Enchantment',
  'Artifact',
  'Planeswalker',
  'Land',
  'Battle',
] as const;

/** Format legality options — ordered by popularity */
const FORMAT_OPTIONS = [
  { value: 'commander', label: 'Commander' },
  { value: 'modern', label: 'Modern' },
  { value: 'standard', label: 'Standard' },
  { value: 'pioneer', label: 'Pioneer' },
  { value: 'pauper', label: 'Pauper' },
  { value: 'legacy', label: 'Legacy' },
  { value: 'vintage', label: 'Vintage' },
  { value: 'premodern', label: 'Premodern' },
  { value: 'historic', label: 'Historic' },
  { value: 'explorer', label: 'Explorer' },
  { value: 'timeless', label: 'Timeless' },
  { value: 'duel', label: 'Duel Commander' },
  { value: 'penny', label: 'Penny Dreadful' },
  { value: 'oathbreaker', label: 'Oathbreaker' },
  { value: 'paupercommander', label: 'Pauper Commander' },
  { value: 'brawl', label: 'Brawl' },
] as const;

// Sort options
const SORT_OPTIONS = [
  { value: 'name-asc', labelKey: 'filters.sortNameAsc' },
  { value: 'name-desc', labelKey: 'filters.sortNameDesc' },
  { value: 'cmc-asc', labelKey: 'filters.sortCmcAsc' },
  { value: 'cmc-desc', labelKey: 'filters.sortCmcDesc' },
  { value: 'price-asc', labelKey: 'filters.sortPriceAsc' },
  { value: 'price-desc', labelKey: 'filters.sortPriceDesc' },
  { value: 'rarity-asc', labelKey: 'filters.sortRarityAsc' },
  { value: 'rarity-desc', labelKey: 'filters.sortRarityDesc' },
  { value: 'edhrec-asc', labelKey: 'filters.sortEdhrecAsc' },
  { value: 'edhrec-desc', labelKey: 'filters.sortEdhrecDesc' },
] as const;

interface SearchFiltersProps {
  cards: ScryfallCard[];
  onFilteredCards: (
    cards: ScryfallCard[],
    hasActiveFilters: boolean,
    filters: FilterState,
  ) => void;
  totalCards: number;
  resetKey: number;
  /** Initial filter state from URL params (applied once on mount) */
  initialFilters?: Partial<FilterState> | null;
  /** Collection lookup map for "owned only" filtering */
  collectionLookup?: Map<string, number>;
}

export function SearchFilters({
  cards,
  onFilteredCards,
  totalCards,
  resetKey,
  initialFilters,
  collectionLookup,
}: SearchFiltersProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const defaultMaxCmc = useMemo(() => {
    return Math.max(16, ...cards.map((c) => c.cmc || 0));
  }, [cards]);
  const {
    filters,
    setFilters,
    defaultFilters,
    applyResetIfNeeded,
    syncCmcRangeIfPristine,
  } = useSearchFilterState({
    defaultMaxCmc,
    initialFilters,
    resetKey,
  });
  const [isOpen, setIsOpen] = useState(false);

  const filteredCards = useMemo(() => {
    return applyCardFilters(cards, filters, collectionLookup);
  }, [cards, filters, collectionLookup]);

  const hasActiveFilters = getHasActiveFilters(filters, defaultMaxCmc);

  // Notify parent of filtered results - use useEffect instead of useMemo for side effects
  useEffect(() => {
    onFilteredCards(filteredCards, hasActiveFilters, filters);
  }, [filteredCards, hasActiveFilters, onFilteredCards, filters]);

  if (applyResetIfNeeded()) {
    setIsOpen(false);
  }

  useEffect(() => {
    syncCmcRangeIfPristine();
  }, [syncCmcRangeIfPristine]);

  const toggleColor = useCallback(
    (colorId: string) => {
      setFilters((prev) => ({
        ...prev,
        colors: prev.colors.includes(colorId)
          ? prev.colors.filter((c) => c !== colorId)
          : [...prev.colors, colorId],
      }));
    },
    [setFilters],
  );

  const toggleType = useCallback(
    (type: string) => {
      setFilters((prev) => ({
        ...prev,
        types: prev.types.includes(type)
          ? prev.types.filter((t) => t !== type)
          : [...prev.types, type],
      }));
    },
    [setFilters],
  );

  const setFormat = useCallback(
    (format: string) => {
      setFilters((prev) => ({
        ...prev,
        format: prev.format === format ? undefined : format,
      }));
    },
    [setFilters],
  );

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, [defaultFilters, setFilters]);

  const activeFilterCount = countActiveFilters(filters, defaultMaxCmc);
  const activeFormatLabel = FORMAT_OPTIONS.find((f) => f.value === filters.format)?.label;

  return (
    <div className="contents">
      {/* Format quick-select — always visible as a compact dropdown */}
      <Select
        value={filters.format ?? '__none__'}
        onValueChange={(value) =>
          setFilters((prev) => ({
            ...prev,
            format: value === '__none__' ? undefined : value,
          }))
        }
      >
        <SelectTrigger
          className={cn(
            'w-[110px] sm:w-[140px] h-8 sm:h-9 text-xs sm:text-sm',
            filters.format && 'border-primary/50 bg-primary/5',
          )}
        >
          <Shield className="h-3.5 w-3.5 mr-1 opacity-50 shrink-0" />
          <SelectValue placeholder="Format" />
        </SelectTrigger>
        <SelectContent className="z-50 bg-popover border border-border shadow-lg">
          <SelectItem value="__none__" className="text-xs sm:text-sm text-muted-foreground">
            All Formats
          </SelectItem>
          {FORMAT_OPTIONS.map((fmt) => (
            <SelectItem
              key={fmt.value}
              value={fmt.value}
              className="text-xs sm:text-sm"
            >
              {fmt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Filter Popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'gap-1.5 sm:gap-2 h-8 sm:h-9 px-2.5 sm:px-3 text-xs sm:text-sm',
              hasActiveFilters && 'border-primary/50 bg-primary/5',
            )}
          >
            <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t('filters.label')}</span>
            {activeFilterCount > 0 && (
              <Badge
                variant="secondary"
                className="h-4 sm:h-5 px-1 sm:px-1.5 text-[10px] sm:text-xs"
              >
                {activeFilterCount}
              </Badge>
            )}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 p-4 z-50 bg-popover border border-border shadow-lg"
          align="start"
          sideOffset={8}
        >
          <div className="space-y-4">
            {/* Format Legality */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Format
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {FORMAT_OPTIONS.slice(0, 8).map((fmt) => (
                  <button
                    key={fmt.value}
                    onClick={() => setFormat(fmt.value)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium transition-all border',
                      filters.format === fmt.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground',
                    )}
                    aria-pressed={filters.format === fmt.value}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('filters.colors')}
                </h4>
                {filters.colors.length > 1 && (
                  <span className="text-[10px] text-muted-foreground">
                    {t('filters.mustHaveAll')}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COLORS.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => toggleColor(color.id)}
                    className={getColorFilterButtonClass(
                      filters.colors.includes(color.id),
                      color.id,
                    )}
                    title={color.name}
                    data-identity={color.id}
                    aria-label={t(
                      'filters.filterByColor',
                      'Filter by {name}',
                    ).replace('{name}', color.name)}
                    aria-pressed={filters.colors.includes(color.id)}
                  >
                    {color.id}
                  </button>
                ))}
              </div>
            </div>

            {/* Card Types */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t('filters.cardType')}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {CARD_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium transition-all border',
                      filters.types.includes(type)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground',
                    )}
                    aria-pressed={filters.types.includes(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* CMC Range */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('filters.manaValue')}
                </h4>
                <span className="text-xs text-muted-foreground">
                  {filters.cmcRange[0]} –{' '}
                  {filters.cmcRange[1] >= defaultMaxCmc
                    ? `${defaultMaxCmc}+`
                    : filters.cmcRange[1]}
                </span>
              </div>
              <Slider
                value={filters.cmcRange}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    cmcRange: value as [number, number],
                  }))
                }
                min={0}
                max={defaultMaxCmc}
                step={1}
                className="w-full"
              />
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="w-full gap-2 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
                {t('filters.clearAll')}
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Owned Only toggle — only for authenticated users */}
      {user && collectionLookup && (
        <button
          onClick={() =>
            setFilters((prev) => ({ ...prev, ownedOnly: !prev.ownedOnly }))
          }
          className={cn(
            'flex items-center gap-1 py-1 px-2.5 text-xs rounded-md transition-colors h-8 sm:h-9',
            filters.ownedOnly
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
          )}
          aria-pressed={!!filters.ownedOnly}
          aria-label={t('collection.showOwnedOnly', 'Owned Only')}
        >
          <Package className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {t('collection.showOwnedOnly', 'Owned Only')}
          </span>
        </button>
      )}

      {/* Sort Dropdown */}
      <Select
        value={filters.sortBy}
        onValueChange={(value) =>
          setFilters((prev) => ({ ...prev, sortBy: value }))
        }
      >
        <SelectTrigger className="w-[130px] sm:w-[160px] h-8 sm:h-9 text-xs sm:text-sm">
          <ArrowUpDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 opacity-50 shrink-0" />
          <SelectValue placeholder={t('filters.sort')} />
        </SelectTrigger>
        <SelectContent className="z-50 bg-popover border border-border shadow-lg">
          {SORT_OPTIONS.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="text-xs sm:text-sm"
            >
              {t(option.labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Active filter badges - hide on mobile to save space */}
      {hasActiveFilters && (
        <div className="hidden sm:flex flex-wrap gap-1.5">
          {activeFormatLabel && (
            <Badge
              variant="secondary"
              className="gap-1 pr-1 cursor-pointer hover:bg-destructive/20 text-xs"
              onClick={() => setFilters((prev) => ({ ...prev, format: undefined }))}
              role="button"
              tabIndex={0}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setFilters((prev) => ({ ...prev, format: undefined }));
                }
              }}
              aria-label={`Remove ${activeFormatLabel} filter`}
            >
              <Shield className="h-3 w-3" />
              {activeFormatLabel}
              <X className="h-3 w-3" aria-hidden="true" />
            </Badge>
          )}
          {filters.colors.map((colorId) => {
            const color = COLORS.find((c) => c.id === colorId);
            return (
              <Badge
                key={colorId}
                variant="secondary"
                className="gap-1 pr-1 cursor-pointer hover:bg-destructive/20 text-xs"
                onClick={() => toggleColor(colorId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleColor(colorId);
                  }
                }}
                aria-label={t(
                  'filters.removeColor',
                  'Remove {name} filter',
                ).replace('{name}', color?.name || colorId)}
              >
                {color?.name || colorId}
                <X className="h-3 w-3" aria-hidden="true" />
              </Badge>
            );
          })}
          {filters.types.map((type) => (
            <Badge
              key={type}
              variant="secondary"
              className="gap-1 pr-1 cursor-pointer hover:bg-destructive/20 text-xs"
              onClick={() => toggleType(type)}
              role="button"
              tabIndex={0}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleType(type);
                }
              }}
              aria-label={t(
                'filters.removeType',
                'Remove {type} filter',
              ).replace('{type}', type)}
            >
              {type}
              <X className="h-3 w-3" aria-hidden="true" />
            </Badge>
          ))}
          {(filters.cmcRange[0] > 0 || filters.cmcRange[1] < defaultMaxCmc) && (
            <Badge
              variant="secondary"
              className="gap-1 pr-1 cursor-pointer hover:bg-destructive/20 text-xs"
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  cmcRange: [0, defaultMaxCmc],
                }))
              }
              role="button"
              tabIndex={0}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setFilters((prev) => ({
                    ...prev,
                    cmcRange: [0, defaultMaxCmc],
                  }));
                }
              }}
              aria-label={t(
                'filters.removeCmc',
                'Remove CMC {range} filter',
              ).replace(
                '{range}',
                `${filters.cmcRange[0]}-${filters.cmcRange[1] >= defaultMaxCmc ? `${defaultMaxCmc}+` : filters.cmcRange[1]}`,
              )}
            >
              {t('filters.cmcRange', 'CMC {min}-{max}')
                .replace('{min}', String(filters.cmcRange[0]))
                .replace(
                  '{max}',
                  filters.cmcRange[1] >= defaultMaxCmc
                    ? `${defaultMaxCmc}+`
                    : String(filters.cmcRange[1]),
                )}
              <X className="h-3 w-3" aria-hidden="true" />
            </Badge>
          )}
        </div>
      )}

      {/* Filtered count indicator */}
      {hasActiveFilters && (
        <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
          {filteredCards.length}/{totalCards}
        </span>
      )}
    </div>
  );
}
