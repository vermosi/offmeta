/**
 * Market Trends page — MTGStocks-style filterable price movers.
 * Filters: time range, price range, % change, format, card type, rarity, direction.
 * Sortable columns: Card, Current, Old, Change %.
 * @module pages/MarketTrends
 */

import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PriceSparkline } from '@/components/collection/PriceSparkline';
import { useMarketTrends, type PriceMover } from '@/hooks/useMarketTrends';
import { cardNameToSlug } from '@/lib/card-slug';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Filter,
  ArrowUpDown,
  ChevronDown,
  X,
} from 'lucide-react';

// ── Constants ──

const TIME_RANGES = [
  { label: '7d', value: 7 },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
] as const;

const DIRECTION_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Gainers', value: 'up' },
  { label: 'Losers', value: 'down' },
] as const;

const FORMAT_OPTIONS = [
  { label: 'All Formats', value: '' },
  { label: 'Standard', value: 'standard' },
  { label: 'Pioneer', value: 'pioneer' },
  { label: 'Modern', value: 'modern' },
  { label: 'Legacy', value: 'legacy' },
  { label: 'Vintage', value: 'vintage' },
  { label: 'Commander', value: 'commander' },
  { label: 'Pauper', value: 'pauper' },
] as const;

const RARITY_OPTIONS = [
  { label: 'All Rarities', value: '' },
  { label: 'Mythic', value: 'mythic' },
  { label: 'Rare', value: 'rare' },
  { label: 'Uncommon', value: 'uncommon' },
  { label: 'Common', value: 'common' },
] as const;

const TYPE_OPTIONS = [
  { label: 'All Types', value: '' },
  { label: 'Creature', value: 'Creature' },
  { label: 'Instant', value: 'Instant' },
  { label: 'Sorcery', value: 'Sorcery' },
  { label: 'Enchantment', value: 'Enchantment' },
  { label: 'Artifact', value: 'Artifact' },
  { label: 'Planeswalker', value: 'Planeswalker' },
  { label: 'Land', value: 'Land' },
] as const;

const PRICE_RANGES = [
  { label: 'Any Price', min: 0, max: Infinity },
  { label: 'Under $1', min: 0, max: 1 },
  { label: '$1 – $5', min: 1, max: 5 },
  { label: '$5 – $20', min: 5, max: 20 },
  { label: '$20 – $50', min: 20, max: 50 },
  { label: '$50+', min: 50, max: Infinity },
] as const;

const MIN_CHANGE_OPTIONS = [
  { label: 'Any %', value: 0 },
  { label: '≥ 5%', value: 5 },
  { label: '≥ 10%', value: 10 },
  { label: '≥ 20%', value: 20 },
  { label: '≥ 50%', value: 50 },
] as const;

type SortField = 'change' | 'current' | 'previous' | 'name';
type SortDir = 'asc' | 'desc';

// ── Filter state ──

interface MarketFilters {
  direction: string;
  format: string;
  rarity: string;
  cardType: string;
  priceRange: number; // index into PRICE_RANGES
  minChange: number;
}

const DEFAULT_FILTERS: MarketFilters = {
  direction: 'all',
  format: '',
  rarity: '',
  cardType: '',
  priceRange: 0,
  minChange: 0,
};

// ── Helpers ──

function countActiveFilters(filters: MarketFilters): number {
  let count = 0;
  if (filters.direction !== 'all') count++;
  if (filters.format) count++;
  if (filters.rarity) count++;
  if (filters.cardType) count++;
  if (filters.priceRange > 0) count++;
  if (filters.minChange > 0) count++;
  return count;
}

function applyFilters(movers: PriceMover[], filters: MarketFilters): PriceMover[] {
  return movers.filter((m) => {
    // Direction
    if (filters.direction !== 'all' && m.direction !== filters.direction) return false;

    // Format legality
    if (filters.format && m.legalities) {
      const legality = (m.legalities as Record<string, string>)[filters.format];
      if (legality !== 'legal' && legality !== 'restricted') return false;
    } else if (filters.format && !m.legalities) {
      return false;
    }

    // Rarity
    if (filters.rarity && m.rarity !== filters.rarity) return false;

    // Card type
    if (filters.cardType && m.type_line) {
      if (!m.type_line.includes(filters.cardType)) return false;
    } else if (filters.cardType && !m.type_line) {
      return false;
    }

    // Price range
    const range = PRICE_RANGES[filters.priceRange];
    if (range && (m.current_price < range.min || m.current_price > range.max)) return false;

    // Min % change
    if (filters.minChange > 0 && Math.abs(m.change_percent) < filters.minChange) return false;

    return true;
  });
}

function sortMovers(movers: PriceMover[], field: SortField, dir: SortDir): PriceMover[] {
  const sorted = [...movers];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case 'change':
        cmp = Math.abs(b.change_percent) - Math.abs(a.change_percent);
        break;
      case 'current':
        cmp = b.current_price - a.current_price;
        break;
      case 'previous':
        cmp = b.previous_price - a.previous_price;
        break;
      case 'name':
        cmp = a.card_name.localeCompare(b.card_name);
        break;
    }
    return dir === 'asc' ? -cmp : cmp;
  });
  return sorted;
}

// ── Components ──

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <label className="sr-only">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-lg border border-border bg-card text-foreground text-xs font-medium pl-3 pr-7 py-2 cursor-pointer hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
    </div>
  );
}

function SortButton({
  label,
  field,
  activeField,
  activeDir,
  onSort,
}: {
  label: string;
  field: SortField;
  activeField: SortField;
  activeDir: SortDir;
  onSort: (field: SortField) => void;
}) {
  const isActive = field === activeField;
  return (
    <button
      onClick={() => onSort(field)}
      className={`text-xs font-medium transition-colors flex items-center gap-1 ${
        isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${isActive ? 'text-primary' : 'opacity-40'}`} />
      {isActive && (
        <span className="text-[10px] text-primary">{activeDir === 'asc' ? '↑' : '↓'}</span>
      )}
    </button>
  );
}

function MoverRow({ mover }: { mover: PriceMover }) {
  const isUp = mover.direction === 'up';
  const slug = cardNameToSlug(mover.card_name);

  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1fr_80px_60px_60px_60px] items-center gap-2 sm:gap-3 rounded-lg border border-border bg-card/50 px-3 sm:px-4 py-2.5 transition-colors hover:bg-muted/40">
      {/* Card name + metadata */}
      <div className="min-w-0">
        <Link
          to={`/cards/${slug}`}
          className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block"
        >
          {mover.card_name}
        </Link>
        <div className="flex items-center gap-1.5 mt-0.5">
          {mover.rarity && (
            <span className={`text-[10px] capitalize ${
              mover.rarity === 'mythic' ? 'text-orange-500' :
              mover.rarity === 'rare' ? 'text-amber-500' :
              mover.rarity === 'uncommon' ? 'text-slate-400' :
              'text-muted-foreground'
            }`}>
              {mover.rarity}
            </span>
          )}
          {mover.type_line && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[120px] hidden sm:inline">
              {mover.type_line.split('—')[0].trim()}
            </span>
          )}
        </div>
      </div>

      {/* Sparkline — hidden on smallest screens */}
      <div className="hidden sm:block">
        <PriceSparkline cardName={mover.card_name} demo />
      </div>

      {/* Previous price */}
      <span className="text-xs text-muted-foreground tabular-nums text-right hidden sm:block">
        ${mover.previous_price.toFixed(2)}
      </span>

      {/* Current price */}
      <span className="text-xs font-medium text-foreground tabular-nums text-right">
        ${mover.current_price.toFixed(2)}
      </span>

      {/* Change badge */}
      <Badge
        variant={isUp ? 'success' : 'destructive'}
        size="sm"
        className="shrink-0 tabular-nums justify-center"
      >
        {isUp ? '+' : ''}{mover.change_percent.toFixed(1)}%
      </Badge>
    </div>
  );
}

function MoverSkeleton() {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1fr_80px_60px_60px_60px] items-center gap-3 rounded-lg border border-border px-4 py-2.5">
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-4 w-12 hidden sm:block" />
      <Skeleton className="h-3 w-10 hidden sm:block" />
      <Skeleton className="h-4 w-12" />
      <Skeleton className="h-5 w-14 rounded-md" />
    </div>
  );
}

// ── Main Page ──

export default function MarketTrends() {
  const [daysBack, setDaysBack] = useState(7);
  const [filters, setFilters] = useState<MarketFilters>(DEFAULT_FILTERS);
  const [sortField, setSortField] = useState<SortField>('change');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showFilters, setShowFilters] = useState(false);

  const { allMovers, isLoading, isDemo } = useMarketTrends(daysBack);

  const activeFilterCount = countActiveFilters(filters);

  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
        return prev;
      }
      setSortDir('desc');
      return field;
    });
  }, []);

  const filteredMovers = useMemo(() => {
    const filtered = applyFilters(allMovers, filters);
    return sortMovers(filtered, sortField, sortDir);
  }, [allMovers, filters, sortField, sortDir]);

  const updateFilter = useCallback(<K extends keyof MarketFilters>(key: K, value: MarketFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Market Trends
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Biggest price movers over the last {daysBack} days
              {filteredMovers.length > 0 && (
                <span className="ml-1">· {filteredMovers.length} cards</span>
              )}
            </p>
          </div>

          {/* Time range selector */}
          <div className="flex items-center gap-2 self-start">
            <div className="flex items-center gap-1 rounded-lg border border-border p-1 bg-muted/30">
              {TIME_RANGES.map((range) => (
                <button
                  key={range.value}
                  onClick={() => setDaysBack(range.value)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    daysBack === range.value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters((prev) => !prev)}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'border-primary/40 bg-primary/5 text-primary'
                  : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filter bar */}
        {showFilters && (
          <div className="rounded-xl border border-border bg-card/50 p-4 mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Filters</span>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear all
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Direction */}
              <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-muted/30">
                {DIRECTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateFilter('direction', opt.value)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      filters.direction === opt.value
                        ? opt.value === 'up'
                          ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                          : opt.value === 'down'
                            ? 'bg-red-500/15 text-red-600 border border-red-500/30'
                            : 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {opt.value === 'up' && <TrendingUp className="h-3 w-3 inline mr-1" />}
                    {opt.value === 'down' && <TrendingDown className="h-3 w-3 inline mr-1" />}
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Format */}
              <FilterSelect
                label="Format"
                value={filters.format}
                options={FORMAT_OPTIONS}
                onChange={(v) => updateFilter('format', v)}
              />

              {/* Rarity */}
              <FilterSelect
                label="Rarity"
                value={filters.rarity}
                options={RARITY_OPTIONS}
                onChange={(v) => updateFilter('rarity', v)}
              />

              {/* Card Type */}
              <FilterSelect
                label="Card Type"
                value={filters.cardType}
                options={TYPE_OPTIONS}
                onChange={(v) => updateFilter('cardType', v)}
              />

              {/* Price Range */}
              <FilterSelect
                label="Price Range"
                value={String(filters.priceRange)}
                options={PRICE_RANGES.map((r, i) => ({ label: r.label, value: String(i) }))}
                onChange={(v) => updateFilter('priceRange', Number(v))}
              />

              {/* Min % Change */}
              <FilterSelect
                label="Min % Change"
                value={String(filters.minChange)}
                options={MIN_CHANGE_OPTIONS.map((o) => ({ label: o.label, value: String(o.value) }))}
                onChange={(v) => updateFilter('minChange', Number(v))}
              />
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {filters.direction !== 'all' && (
                  <FilterChip
                    label={filters.direction === 'up' ? 'Gainers only' : 'Losers only'}
                    onRemove={() => updateFilter('direction', 'all')}
                  />
                )}
                {filters.format && (
                  <FilterChip
                    label={FORMAT_OPTIONS.find((f) => f.value === filters.format)?.label ?? filters.format}
                    onRemove={() => updateFilter('format', '')}
                  />
                )}
                {filters.rarity && (
                  <FilterChip
                    label={filters.rarity}
                    onRemove={() => updateFilter('rarity', '')}
                  />
                )}
                {filters.cardType && (
                  <FilterChip
                    label={filters.cardType}
                    onRemove={() => updateFilter('cardType', '')}
                  />
                )}
                {filters.priceRange > 0 && (
                  <FilterChip
                    label={PRICE_RANGES[filters.priceRange].label}
                    onRemove={() => updateFilter('priceRange', 0)}
                  />
                )}
                {filters.minChange > 0 && (
                  <FilterChip
                    label={`≥ ${filters.minChange}%`}
                    onRemove={() => updateFilter('minChange', 0)}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Demo banner */}
        {isDemo && !isLoading && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 mb-4 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Showing sample data — real trends will appear as price history accumulates.
            </span>
          </div>
        )}

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1fr_80px_60px_60px_60px] items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 mb-1">
          <SortButton label="Card" field="name" activeField={sortField} activeDir={sortDir} onSort={handleSort} />
          <span className="text-[10px] text-muted-foreground hidden sm:block">Trend</span>
          <SortButton label="Old" field="previous" activeField={sortField} activeDir={sortDir} onSort={handleSort} />
          <SortButton label="New" field="current" activeField={sortField} activeDir={sortDir} onSort={handleSort} />
          <SortButton label="%" field="change" activeField={sortField} activeDir={sortDir} onSort={handleSort} />
        </div>

        {/* Results list */}
        <div className="space-y-1.5">
          {isLoading ? (
            Array.from({ length: 10 }).map((_, i) => <MoverSkeleton key={i} />)
          ) : filteredMovers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">
                No cards match the current filters.
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="mt-2 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            filteredMovers.map((m) => <MoverRow key={m.card_name} mover={m} />)
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ── Filter Chip ──

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium capitalize">
      {label}
      <button onClick={onRemove} className="hover:text-primary/70 transition-colors">
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}
