/**
 * Market Trends page - MTGStocks-style filterable price movers.
 * Filters: time range, price range, % change, format, card type, rarity, direction.
 * Sortable columns: Card, Current, Old, Change %.
 * @module pages/MarketTrends
 */

import { useState, useMemo, useCallback, useEffect, useId } from 'react';
import { Link } from 'react-router-dom';
import { applySeoMeta } from '@/lib/seo';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';


import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/i18n';
import { CardPriceSparkline } from '@/components/CardPriceSparkline';
import { useMarketTrends, type PriceMover } from '@/hooks';
import { useNoIndex } from '@/hooks';
import { cardNameToSlug } from '@/lib/card-slug';
import {
  applyFilters,
  countActiveFilters,
  sortMovers,
  type MarketFilters,
  type SortDir,
  type SortField,
  DEFAULT_FILTERS,
  PRICE_RANGES,
  PAGE_SIZE,
  pageCount,
  clampPage,
  paginate,
  formatUpdatedAgo,
} from './market-trends-utils';

import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Filter,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Database,
  Cloud,
  RefreshCw,
  X,
} from 'lucide-react';

const TIME_RANGES = [
  { label: '7d', value: 7 },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
] as const;

const DIRECTION_OPTIONS = [
  { key: 'market.direction.all', label: 'All', value: 'all' },
  { key: 'market.direction.gainers', label: 'Gainers', value: 'up' },
  { key: 'market.direction.losers', label: 'Losers', value: 'down' },
] as const;

const FORMAT_OPTIONS = [
  { key: 'market.format.all', label: 'All Formats', value: '' },
  { key: 'market.format.standard', label: 'Standard', value: 'standard' },
  { key: 'market.format.pioneer', label: 'Pioneer', value: 'pioneer' },
  { key: 'market.format.modern', label: 'Modern', value: 'modern' },
  { key: 'market.format.legacy', label: 'Legacy', value: 'legacy' },
  { key: 'market.format.vintage', label: 'Vintage', value: 'vintage' },
  { key: 'market.format.commander', label: 'Commander', value: 'commander' },
  { key: 'market.format.pauper', label: 'Pauper', value: 'pauper' },
] as const;

const RARITY_OPTIONS = [
  { key: 'market.rarity.all', label: 'All Rarities', value: '' },
  { key: 'market.rarity.mythic', label: 'Mythic', value: 'mythic' },
  { key: 'market.rarity.rare', label: 'Rare', value: 'rare' },
  { key: 'market.rarity.uncommon', label: 'Uncommon', value: 'uncommon' },
  { key: 'market.rarity.common', label: 'Common', value: 'common' },
] as const;

const TYPE_OPTIONS = [
  { key: 'market.type.all', label: 'All Types', value: '' },
  { label: 'Creature', value: 'Creature' },
  { label: 'Instant', value: 'Instant' },
  { label: 'Sorcery', value: 'Sorcery' },
  { label: 'Enchantment', value: 'Enchantment' },
  { label: 'Artifact', value: 'Artifact' },
  { label: 'Planeswalker', value: 'Planeswalker' },
  { label: 'Land', value: 'Land' },
] as const;

const MIN_CHANGE_OPTIONS = [
  { key: 'market.minChange.any', label: 'Any %', value: 0 },
  { label: '>= 5%', value: 5 },
  { label: '>= 10%', value: 10 },
  { label: '>= 20%', value: 20 },
  { label: '>= 50%', value: 50 },
] as const;

function trOpt(t: (k: string, d: string) => string, opt: { key?: string; label: string }): string {
  return opt.key ? t(opt.key, opt.label) : opt.label;
}

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
  const selectId = useId();
  return (
    <div className="relative min-w-[10rem]">
      <label className="sr-only" htmlFor={selectId}>
        {label}
      </label>
      <select
        id={selectId}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-border bg-card text-foreground text-xs font-medium pl-3 pr-7 py-2 cursor-pointer hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
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
        isActive
          ? 'text-foreground'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
      <ArrowUpDown
        className={`h-3 w-3 ${isActive ? 'text-primary' : 'opacity-40'}`}
      />
      {isActive && (
        <span className="text-[10px] text-primary">
          {activeDir === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </button>
  );
}

/** Shared dense row template so header, rows, and skeletons stay aligned. */
const ROW_GRID =
  'grid grid-cols-[1.5rem_1fr_4rem_4.5rem] sm:grid-cols-[2rem_1fr_72px_4.5rem_4.5rem_4.75rem] items-center gap-2 sm:gap-3 px-2 sm:px-3';

function MoverRow({ mover, rank }: { mover: PriceMover; rank: number }) {
  const isUp = mover.direction === 'up';
  const slug = cardNameToSlug(mover.card_name);

  return (
    <div
      className={`${ROW_GRID} min-h-11 border-b border-border/40 last:border-0 odd:bg-muted/20 transition-colors hover:bg-muted/50`}
    >
      <span className="text-[11px] tabular-nums text-muted-foreground text-right">
        {rank}
      </span>
      <div className="min-w-0 flex flex-col justify-center py-1">
        <div className="flex items-baseline gap-2">
          <Link
            to={`/cards/${slug}`}
            className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate"
          >
            {mover.card_name}
          </Link>
          {mover.rarity && (
            <span
              className={`text-[10px] capitalize shrink-0 hidden sm:inline ${
                mover.rarity === 'mythic'
                  ? 'text-rarity-mythic'
                  : mover.rarity === 'rare'
                    ? 'text-rarity-rare'
                    : mover.rarity === 'uncommon'
                      ? 'text-rarity-uncommon'
                      : 'text-muted-foreground'
              }`}
            >
              {mover.rarity}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1.5 text-[10px] text-muted-foreground truncate">
          {mover.set_name && (
            <span className="truncate">{mover.set_name}</span>
          )}
          {mover.collector_number && (
            <span className="tabular-nums shrink-0">
              #{mover.collector_number}
            </span>
          )}
          {mover.type_line && (
            <span className="truncate hidden lg:inline">
              {mover.type_line.split('—')[0].trim()}
            </span>
          )}
        </div>
      </div>
      <div className="hidden sm:block w-[72px] overflow-hidden">
        <CardPriceSparkline
          cardName={mover.card_name}
          scryfallId={mover.scryfall_id ?? undefined}
          showSeriesToggle={false}
          width={68}
          height={20}
        />
      </div>


      <span className="text-xs text-muted-foreground tabular-nums text-right hidden sm:block">
        ${mover.previous_price.toFixed(2)}
      </span>
      <span className="text-xs font-medium text-foreground tabular-nums text-right">
        ${mover.current_price.toFixed(2)}
      </span>
      <span
        className={`text-xs font-semibold tabular-nums text-right ${
          isUp ? 'text-success' : 'text-destructive'
        }`}
      >
        {isUp ? '+' : ''}
        {mover.change_percent.toFixed(1)}%
      </span>
    </div>
  );
}

function MoverSkeleton() {
  return (
    <div className={`${ROW_GRID} min-h-11 border-b border-border/40 last:border-0`}>
      <Skeleton className="h-3 w-3 ml-auto" />
      <div className="flex flex-col justify-center gap-1 py-1">
        <Skeleton className="h-4 w-40 max-w-full" />
        <Skeleton className="h-2.5 w-28 max-w-full" />
      </div>
      <Skeleton className="h-4 w-14 hidden sm:block" />
      <Skeleton className="h-3 w-10 ml-auto hidden sm:block" />
      <Skeleton className="h-3 w-10 ml-auto" />
      <Skeleton className="h-3 w-12 ml-auto" />
    </div>
  );
}


export default function MarketTrends() {
  const { t } = useTranslation();
  const [daysBack, setDaysBack] = useState(7);
  const [filters, setFilters] = useState<MarketFilters>(DEFAULT_FILTERS);
  const [sortField, setSortField] = useState<SortField>('change');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const {
    allMovers,
    isLoading,
    isEmpty,
    isError,
    isRefetching,
    errorMessage,
    retry,
    fetchedAt,
    source,
  } = useMarketTrends(daysBack);

  // Re-render the relative timestamp roughly once a minute.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const updatedLabel = formatUpdatedAgo(fetchedAt, nowTick);
  const isCacheHit = source === 'cache' || source === 'inflight';
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

  const totalPages = pageCount(filteredMovers.length);
  const currentPage = clampPage(page, filteredMovers.length);
  const pageMovers = useMemo(
    () => paginate(filteredMovers, currentPage),
    [filteredMovers, currentPage],
  );
  const rankOffset = (currentPage - 1) * PAGE_SIZE;

  // Reset to the first page whenever the result set changes.
  const resultScope = JSON.stringify([filters, sortField, sortDir, daysBack]);
  const [pageScope, setPageScope] = useState(resultScope);
  if (pageScope !== resultScope) {
    setPageScope(resultScope);
    setPage(1);
  }

  const goToPage = useCallback(
    (next: number) => {
      setPage(clampPage(next, filteredMovers.length));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [filteredMovers.length],
  );

  const updateFilter = useCallback(
    <K extends keyof MarketFilters>(key: K, value: MarketFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const clearFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  useNoIndex(true);

  useEffect(() => {
    return applySeoMeta({
      title: t('market.seoTitle', 'MTG Price Movers and Market Trends | OffMeta'),
      description: t(
        'market.seoDescription',
        'Track Magic card price movers, biggest gainers and losers, with filterable time ranges, formats, and rarity.',
      ),
      url: 'https://offmeta.app/market',
      extraMeta: { robots: 'noindex, follow' },
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-4xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {t('market.title', 'Market Trends')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('market.subtitle', 'Biggest price movers over the last {days} days', { days: daysBack })}
              {filteredMovers.length > 0 && (
                <span className="ml-1">· {t('market.cardsCount', '{count} cards', { count: filteredMovers.length })}</span>
              )}
            </p>
            {updatedLabel && !isLoading && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span>{t('market.lastUpdated', 'Last updated {time}', { time: updatedLabel })}</span>
                <span
                  title={
                    isCacheHit
                      ? t('market.cacheHitTitle', 'Served from the in-memory session cache')
                      : t('market.freshFetchTitle', 'Freshly fetched from the backend')
                  }
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium ${
                    isCacheHit
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border bg-muted/40 text-muted-foreground'
                  }`}
                >
                  {isCacheHit ? (
                    <Database className="h-3 w-3" />
                  ) : (
                    <Cloud className="h-3 w-3" />
                  )}
                  {isCacheHit ? t('market.cacheHit', 'Cache hit') : t('market.freshFetch', 'Fresh fetch')}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 self-stretch sm:self-start w-full sm:w-auto">
            <div className="flex items-center gap-1 rounded-lg border border-border p-1 bg-muted/30 overflow-x-auto max-w-full">
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
            <button
              onClick={() => setShowFilters((prev) => !prev)}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'border-primary/40 bg-primary/5 text-primary'
                  : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('market.filters', 'Filters')}</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
        {showFilters && (
          <div className="rounded-xl border border-border bg-card/50 p-4 mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                {t('market.filters', 'Filters')}
              </span>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  {t('market.clearAll', 'Clear all')}
                </button>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-muted/30">
                {DIRECTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateFilter('direction', opt.value)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      filters.direction === opt.value
                        ? opt.value === 'up'
                          ? 'bg-analytics-local/15 text-success border border-success/30'
                          : opt.value === 'down'
                            ? 'bg-destructive/15 text-destructive border border-destructive/30'
                            : 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {opt.value === 'up' && (
                      <TrendingUp className="h-3 w-3 inline mr-1" />
                    )}
                    {opt.value === 'down' && (
                      <TrendingDown className="h-3 w-3 inline mr-1" />
                    )}
                    {trOpt(t, opt)}
                  </button>
                ))}
              </div>
              <FilterSelect
                label={t('market.format.label', 'Format')}
                value={filters.format}
                options={FORMAT_OPTIONS.map((o) => ({ label: trOpt(t, o), value: o.value }))}
                onChange={(v) => updateFilter('format', v)}
              />
              <FilterSelect
                label={t('market.rarity.label', 'Rarity')}
                value={filters.rarity}
                options={RARITY_OPTIONS.map((o) => ({ label: trOpt(t, o), value: o.value }))}
                onChange={(v) => updateFilter('rarity', v)}
              />
              <FilterSelect
                label={t('market.type.label', 'Card Type')}
                value={filters.cardType}
                options={TYPE_OPTIONS.map((o) => ({ label: trOpt(t, o), value: o.value }))}
                onChange={(v) => updateFilter('cardType', v)}
              />
              <FilterSelect
                label={t('market.priceRange.label', 'Price Range')}
                value={String(filters.priceRange)}
                options={PRICE_RANGES.map((r, i) => ({
                  label: r.label,
                  value: String(i),
                }))}
                onChange={(v) => updateFilter('priceRange', Number(v))}
              />
              <FilterSelect
                label={t('market.minChange.label', 'Min % Change')}
                value={String(filters.minChange)}
                options={MIN_CHANGE_OPTIONS.map((o) => ({
                  label: trOpt(t, o),
                  value: String(o.value),
                }))}
                onChange={(v) => updateFilter('minChange', Number(v))}
              />
            </div>
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {filters.direction !== 'all' && (
                  <FilterChip
                    label={
                      filters.direction === 'up'
                        ? t('market.gainersOnly', 'Gainers only')
                        : t('market.losersOnly', 'Losers only')
                    }
                    onRemove={() => updateFilter('direction', 'all')}
                  />
                )}
                {filters.format && (
                  <FilterChip
                    label={
                      FORMAT_OPTIONS.find((f) => f.value === filters.format)
                        ?.label ?? filters.format
                    }
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
                    label={`>= ${filters.minChange}%`}
                    onRemove={() => updateFilter('minChange', 0)}
                  />
                )}
              </div>
            )}
          </div>
        )}
        {isError && !isLoading && (
          <div
            role="alert"
            className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 mb-4 text-sm text-foreground"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            <span className="flex-1">
              {errorMessage} {t('market.errorSuffix', 'Your filters are still applied — retry when ready.')}
            </span>
            <button
              onClick={() => retry()}
              disabled={isRefetching}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`}
              />
              {isRefetching ? t('market.retrying', 'Retrying…') : t('market.tryAgain', 'Try again')}
            </button>
          </div>
        )}
        {isEmpty && !isLoading && !isError && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 mb-4 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{t('market.noMovers', 'No significant price movers in this window yet.')}</span>
          </div>
        )}
        {isRefetching && !isError && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-2 mb-4 text-xs text-muted-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            {t('market.refreshing', 'Refreshing price movers…')}
          </div>
        )}
        <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
          <div
            className={`${ROW_GRID} h-9 border-b border-border bg-muted/40 sticky top-0 z-10 backdrop-blur`}
          >
            <span className="text-[10px] text-muted-foreground text-right">
              #
            </span>
            <SortButton
              label={t('market.column.card', 'Card')}
              field="name"
              activeField={sortField}
              activeDir={sortDir}
              onSort={handleSort}
            />
            <span className="text-[10px] text-muted-foreground hidden sm:block">
              {t('market.column.trend', 'Trend')}
            </span>
            <span className="hidden sm:flex justify-end">
              <SortButton
                label={t('market.column.old', 'Old')}
                field="previous"
                activeField={sortField}
                activeDir={sortDir}
                onSort={handleSort}
              />
            </span>
            <span className="flex justify-end">
              <SortButton
                label={t('market.column.new', 'New')}
                field="current"
                activeField={sortField}
                activeDir={sortDir}
                onSort={handleSort}
              />
            </span>
            <span className="flex justify-end">
              <SortButton
                label={t('market.column.percent', '%')}
                field="change"
                activeField={sortField}
                activeDir={sortDir}
                onSort={handleSort}
              />
            </span>
          </div>
          {isLoading || (isError && allMovers.length === 0 && isRefetching) ? (
            Array.from({ length: 12 }).map((_, i) => <MoverSkeleton key={i} />)
          ) : filteredMovers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">
                {t('market.noMatch', 'No cards match the current filters.')}
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="mt-2 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  {t('market.clearAllFilters', 'Clear all filters')}
                </button>
              )}
            </div>
          ) : (
            pageMovers.map((m, i) => (
              <MoverRow
                key={m.scryfall_id ?? `${m.card_name}-${rankOffset + i}`}
                mover={m}
                rank={rankOffset + i + 1}
              />
            ))
          )}
        </div>

        {!isLoading && filteredMovers.length > PAGE_SIZE && (
          <nav
            aria-label={t('market.pagination.label', 'Market trends pagination')}
            className="mt-4 flex items-center justify-between gap-3"
          >
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1 || isRefetching}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {t('market.pagination.previous', 'Previous')}
            </button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {t('market.pagination.page', 'Page {current} of {total}', { current: currentPage, total: totalPages })}
              <span className="hidden sm:inline">
                {' '}· {t('market.cardsCount', '{count} cards', { count: filteredMovers.length })}
              </span>
            </span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages || isRefetching}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t('market.pagination.next', 'Next')}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </nav>
        )}

      </main>
      <Footer />
    </div>
  );
}

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium capitalize">
      {label}
      <button
        onClick={onRemove}
        className="hover:text-primary/70 transition-colors"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}
