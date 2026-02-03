/**
 * Post-search filters and sort options for card results.
 * Provides color filters, type filters, CMC range, and sorting.
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
import { cn } from '@/lib/utils';
import { Filter, ArrowUpDown, X, ChevronDown } from 'lucide-react';

// Color definitions with mana symbols
const COLORS = [
  {
    id: 'W',
    name: 'White',
    bg: 'bg-amber-100 dark:bg-amber-200',
    text: 'text-amber-900',
    border: 'border-amber-300',
  },
  {
    id: 'U',
    name: 'Blue',
    bg: 'bg-blue-100 dark:bg-blue-200',
    text: 'text-blue-900',
    border: 'border-blue-300',
  },
  {
    id: 'B',
    name: 'Black',
    bg: 'bg-zinc-200 dark:bg-zinc-300',
    text: 'text-zinc-900',
    border: 'border-zinc-400',
  },
  {
    id: 'R',
    name: 'Red',
    bg: 'bg-red-100 dark:bg-red-200',
    text: 'text-red-900',
    border: 'border-red-300',
  },
  {
    id: 'G',
    name: 'Green',
    bg: 'bg-green-100 dark:bg-green-200',
    text: 'text-green-900',
    border: 'border-green-300',
  },
  {
    id: 'C',
    name: 'Colorless',
    bg: 'bg-slate-100 dark:bg-slate-200',
    text: 'text-slate-700',
    border: 'border-slate-300',
  },
] as const;

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

// Sort options
const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'cmc-asc', label: 'CMC (Low to High)' },
  { value: 'cmc-desc', label: 'CMC (High to Low)' },
  { value: 'price-asc', label: 'Price (Low to High)' },
  { value: 'price-desc', label: 'Price (High to Low)' },
  { value: 'rarity-asc', label: 'Rarity (Common first)' },
  { value: 'rarity-desc', label: 'Rarity (Mythic first)' },
] as const;

const RARITY_ORDER = {
  common: 0,
  uncommon: 1,
  rare: 2,
  mythic: 3,
  special: 4,
  bonus: 5,
};

interface SearchFiltersProps {
  cards: ScryfallCard[];
  onFilteredCards: (
    cards: ScryfallCard[],
    hasActiveFilters: boolean,
    filters: FilterState,
  ) => void;
  totalCards: number;
  resetKey: number;
}

export function SearchFilters({
  cards,
  onFilteredCards,
  totalCards,
  resetKey,
}: SearchFiltersProps) {
  const defaultMaxCmc = useMemo(() => {
    return Math.max(16, ...cards.map((c) => c.cmc || 0));
  }, [cards]);
  const lastDefaultMaxCmc = useRef(defaultMaxCmc);
  const buildDefaultFilters = useCallback(
    (maxCmc: number): FilterState => ({
      colors: [],
      types: [],
      cmcRange: [0, maxCmc],
      sortBy: 'name-asc',
    }),
    [],
  );
  const [filters, setFilters] = useState<FilterState>(() =>
    buildDefaultFilters(defaultMaxCmc),
  );
  const [isOpen, setIsOpen] = useState(false);
  const defaultFilters = useMemo(
    () => buildDefaultFilters(defaultMaxCmc),
    [buildDefaultFilters, defaultMaxCmc],
  );

  // Apply filters and sorting
  const filteredCards = useMemo(() => {
    let result = [...cards];

    // Color filter - AND logic: card must have ALL selected colors
    if (filters.colors.length > 0) {
      result = result.filter((card) => {
        const cardColors = card.colors || [];
        const isColorless = cardColors.length === 0;

        // Handle colorless separately
        const wantsColorless = filters.colors.includes('C');
        const colorFilters = filters.colors.filter((c) => c !== 'C');

        // If only colorless is selected, match colorless cards
        if (colorFilters.length === 0 && wantsColorless) {
          return isColorless;
        }

        // If colorless + colors selected, that's contradictory - show nothing
        if (colorFilters.length > 0 && wantsColorless && isColorless) {
          return false;
        }

        // Card must have ALL selected colors (AND logic)
        return colorFilters.every((color) => cardColors.includes(color));
      });
    }

    // Type filter
    if (filters.types.length > 0) {
      result = result.filter((card) => {
        const typeLine = card.type_line.toLowerCase();
        return filters.types.some((type) =>
          typeLine.includes(type.toLowerCase()),
        );
      });
    }

    // CMC range filter
    result = result.filter((card) => {
      const cmc = card.cmc || 0;
      return cmc >= filters.cmcRange[0] && cmc <= filters.cmcRange[1];
    });

    // Sorting
    const [sortField, sortDir] = filters.sortBy.split('-') as [
      string,
      'asc' | 'desc',
    ];
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'cmc':
          comparison = (a.cmc || 0) - (b.cmc || 0);
          break;
        case 'price': {
          const priceA = parseFloat(a.prices?.usd || '0');
          const priceB = parseFloat(b.prices?.usd || '0');
          comparison = priceA - priceB;
          break;
        }
        case 'rarity': {
          const rarityA =
            RARITY_ORDER[a.rarity as keyof typeof RARITY_ORDER] || 0;
          const rarityB =
            RARITY_ORDER[b.rarity as keyof typeof RARITY_ORDER] || 0;
          comparison = rarityA - rarityB;
          break;
        }
      }

      return sortDir === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [cards, filters]);

  // Calculate if filters are active (before the effect that uses it)
  const hasActiveFilters =
    filters.colors.length > 0 ||
    filters.types.length > 0 ||
    filters.cmcRange[0] > 0 ||
    filters.cmcRange[1] < defaultMaxCmc;

  // Notify parent of filtered results - use useEffect instead of useMemo for side effects
  useEffect(() => {
    onFilteredCards(filteredCards, hasActiveFilters, filters);
  }, [filteredCards, hasActiveFilters, onFilteredCards, filters]);

  useEffect(() => {
    setFilters(defaultFilters);
    setIsOpen(false);
  }, [defaultFilters, resetKey]);

  useEffect(() => {
    if (lastDefaultMaxCmc.current === defaultMaxCmc) {
      return;
    }
    setFilters((prev) => {
      const isDefaultRange =
        prev.colors.length === 0 &&
        prev.types.length === 0 &&
        prev.sortBy === 'name-asc' &&
        prev.cmcRange[0] === 0 &&
        prev.cmcRange[1] === lastDefaultMaxCmc.current;

      lastDefaultMaxCmc.current = defaultMaxCmc;

      if (!isDefaultRange) {
        return prev;
      }

      return {
        ...prev,
        cmcRange: [0, defaultMaxCmc],
      };
    });
  }, [defaultMaxCmc]);

  const toggleColor = useCallback((colorId: string) => {
    setFilters((prev) => ({
      ...prev,
      colors: prev.colors.includes(colorId)
        ? prev.colors.filter((c) => c !== colorId)
        : [...prev.colors, colorId],
    }));
  }, []);

  const toggleType = useCallback((type: string) => {
    setFilters((prev) => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type],
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, [defaultFilters]);

  const activeFilterCount =
    filters.colors.length +
    filters.types.length +
    (filters.cmcRange[0] > 0 || filters.cmcRange[1] < defaultMaxCmc ? 1 : 0);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 animate-reveal">
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
            <span className="hidden sm:inline">Filters</span>
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Colors
                </h4>
                {filters.colors.length > 1 && (
                  <span className="text-[10px] text-muted-foreground">
                    Must have all
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COLORS.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => toggleColor(color.id)}
                    className={cn(
                      'h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all',
                      color.bg,
                      color.text,
                      filters.colors.includes(color.id)
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110'
                        : 'opacity-60 hover:opacity-100 border-transparent',
                    )}
                    title={color.name}
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
                Card Type
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
                  Mana Value
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
                Clear all filters
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Sort Dropdown */}
      <Select
        value={filters.sortBy}
        onValueChange={(value) =>
          setFilters((prev) => ({ ...prev, sortBy: value }))
        }
      >
        <SelectTrigger className="w-[130px] sm:w-[160px] h-8 sm:h-9 text-xs sm:text-sm">
          <ArrowUpDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 opacity-50" />
          <SelectValue placeholder="Sort..." />
        </SelectTrigger>
        <SelectContent className="z-50 bg-popover border border-border shadow-lg">
          {SORT_OPTIONS.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="text-xs sm:text-sm"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Active filter badges - hide on mobile to save space */}
      {hasActiveFilters && (
        <div className="hidden sm:flex flex-wrap gap-1.5">
          {filters.colors.map((colorId) => {
            const color = COLORS.find((c) => c.id === colorId);
            return (
              <Badge
                key={colorId}
                variant="secondary"
                className="gap-1 pr-1 cursor-pointer hover:bg-destructive/20 text-xs"
                onClick={() => toggleColor(colorId)}
              >
                {color?.name || colorId}
                <X className="h-3 w-3" />
              </Badge>
            );
          })}
          {filters.types.map((type) => (
            <Badge
              key={type}
              variant="secondary"
              className="gap-1 pr-1 cursor-pointer hover:bg-destructive/20 text-xs"
              onClick={() => toggleType(type)}
            >
              {type}
              <X className="h-3 w-3" />
            </Badge>
          ))}
          {(filters.cmcRange[0] > 0 || filters.cmcRange[1] < 16) && (
            <Badge
              variant="secondary"
              className="gap-1 pr-1 cursor-pointer hover:bg-destructive/20 text-xs"
              onClick={() =>
                setFilters((prev) => ({ ...prev, cmcRange: [0, 16] }))
              }
            >
              CMC {filters.cmcRange[0]}-
              {filters.cmcRange[1] >= 16 ? '16+' : filters.cmcRange[1]}
              <X className="h-3 w-3" />
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
