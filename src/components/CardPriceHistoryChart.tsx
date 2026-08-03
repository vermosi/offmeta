/**
 * Full price-history chart for a card: multi-series lines, range selection,
 * gridlines, axis labels and a hover crosshair readout.
 * @module components/CardPriceHistoryChart
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePriceHistory, type PriceSnapshot } from '@/hooks/usePriceHistory';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/core/utils';
import { useTranslation } from '@/lib/i18n';

type SeriesKey = 'low' | 'average' | 'market' | 'foil';

interface SeriesConfig {
  key: SeriesKey;
  label: string;
  color: string;
  pick: (snapshot: PriceSnapshot) => number | null;
}

const SERIES: SeriesConfig[] = [
  { key: 'low', label: 'Low', color: 'hsl(var(--muted-foreground))', pick: (s) => s.price_low },
  { key: 'average', label: 'Average', color: 'hsl(var(--primary))', pick: (s) => s.price_average },
  {
    key: 'market',
    label: 'Market',
    color: 'hsl(var(--chart-2, 142 71% 45%))',
    pick: (s) => s.price_market ?? s.price_usd,
  },
  {
    key: 'foil',
    label: 'Foil',
    color: 'hsl(var(--chart-4, 43 96% 56%))',
    pick: (s) => s.price_foil ?? s.price_usd_foil,
  },
];

const RANGES = [
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '1Y', days: 365 },
  { label: 'All', days: 3650 },
] as const;

const HEIGHT = 200;
const PAD = { top: 12, right: 52, bottom: 24, left: 8 };

const formatPrice = (value: number) =>
  `$${value.toFixed(value >= 100 ? 0 : 2)}`;

const formatDate = (iso: string, long = false) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(long ? { year: 'numeric' } : {}),
  });

interface CardPriceHistoryChartProps {
  cardName: string;
  className?: string;
}

export function CardPriceHistoryChart({ cardName, className }: CardPriceHistoryChartProps) {
  const { t } = useTranslation();
  const [rangeIndex, setRangeIndex] = useState(1);
  const [hidden, setHidden] = useState<Set<SeriesKey>>(() => new Set<SeriesKey>(['foil']));
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [width, setWidth] = useState(560);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError } = usePriceHistory(cardName, RANGES[rangeIndex].days);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      const next = entry.contentRect.width;
      if (next > 0) setWidth(next);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const snapshots = useMemo(() => data ?? [], [data]);

  const visibleSeries = useMemo(
    () =>
      SERIES.filter(
        (series) =>
          !hidden.has(series.key) && snapshots.some((snapshot) => series.pick(snapshot) != null),
      ),
    [hidden, snapshots],
  );

  const scale = useMemo(() => {
    const values = visibleSeries.flatMap((series) =>
      snapshots.map((snapshot) => series.pick(snapshot)).filter((v): v is number => v != null),
    );
    if (values.length < 2 || snapshots.length < 2) return null;

    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const span = rawMax - rawMin || rawMax || 1;
    const min = Math.max(0, rawMin - span * 0.12);
    const max = rawMax + span * 0.12;

    const plotW = Math.max(80, width - PAD.left - PAD.right);
    const plotH = HEIGHT - PAD.top - PAD.bottom;

    const x = (index: number) => PAD.left + (index / (snapshots.length - 1)) * plotW;
    const y = (value: number) => PAD.top + plotH - ((value - min) / (max - min)) * plotH;

    const ticks = [0, 0.5, 1].map((t) => min + (max - min) * t);

    return { x, y, min, max, plotW, plotH, ticks };
  }, [snapshots, visibleSeries, width]);

  const latest = snapshots[snapshots.length - 1];
  const activeSnapshot = hoverIndex != null ? snapshots[hoverIndex] : latest;

  const handlePointer = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!scale || snapshots.length < 2) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left - PAD.left) / scale.plotW;
    const index = Math.round(Math.min(1, Math.max(0, ratio)) * (snapshots.length - 1));
    setHoverIndex(index);
  };

  const toggleSeries = (key: SeriesKey) => {
    setHidden((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <section
      className={cn(
        'rounded-xl border border-border/60 bg-card/60 backdrop-blur-xl p-4 space-y-3',
        className,
      )}
      aria-label="Price history"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Price History</h3>
        <div
          className="flex rounded-md border border-border bg-muted/60 p-0.5 text-[11px]"
          role="group"
          aria-label="Time range"
        >
          {RANGES.map((range, index) => (
            <button
              key={range.label}
              type="button"
              onClick={() => {
                setRangeIndex(index);
                setHoverIndex(null);
              }}
              aria-pressed={rangeIndex === index}
              className={cn(
                'rounded px-2 py-1 min-h-[28px] transition-colors',
                rangeIndex === index
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Series readout / legend toggles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SERIES.map((series) => {
          const value = activeSnapshot ? series.pick(activeSnapshot) : null;
          const isHidden = hidden.has(series.key);
          return (
            <button
              key={series.key}
              type="button"
              onClick={() => toggleSeries(series.key)}
              aria-pressed={!isHidden}
              className={cn(
                'flex flex-col items-start gap-0.5 rounded-lg border px-2 py-1.5 text-left transition-colors min-h-[44px]',
                isHidden
                  ? 'border-border/40 opacity-50 hover:opacity-80'
                  : 'border-border/70 bg-muted/40',
              )}
            >
              <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                <span
                  aria-hidden="true"
                  className="h-0.5 w-3 rounded-full"
                  style={{ backgroundColor: series.color }}
                />
                {series.label}
              </span>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {value != null ? formatPrice(value) : '—'}
              </span>
            </button>
          );
        })}
      </div>

      <div ref={containerRef} className="w-full">
        {isLoading ? (
          <Skeleton className="w-full" style={{ height: HEIGHT }} />
        ) : isError ? (
          <p className="py-10 text-center text-xs text-muted-foreground">
            Price history is unavailable right now.
          </p>
        ) : !scale ? (
          <p className="py-10 text-center text-xs text-muted-foreground">
            Not enough price data yet for this range.
          </p>
        ) : (
          <svg
            width={width}
            height={HEIGHT}
            viewBox={`0 0 ${width} ${HEIGHT}`}
            className="touch-none select-none"
            role="img"
            aria-label={`Price history chart for ${cardName}`}
            onPointerMove={handlePointer}
            onPointerLeave={() => setHoverIndex(null)}
          >
            {/* Gridlines + price axis */}
            {scale.ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  x2={PAD.left + scale.plotW}
                  y1={scale.y(tick)}
                  y2={scale.y(tick)}
                  stroke="hsl(var(--border))"
                  strokeWidth={1}
                  strokeDasharray="3 4"
                />
                <text
                  x={PAD.left + scale.plotW + 6}
                  y={scale.y(tick) + 3}
                  className="fill-muted-foreground text-[10px] tabular-nums"
                >
                  {formatPrice(tick)}
                </text>
              </g>
            ))}

            {/* Date axis */}
            {[0, Math.floor((snapshots.length - 1) / 2), snapshots.length - 1].map((index, i) => (
              <text
                key={`${index}-${i}`}
                x={scale.x(index)}
                y={HEIGHT - 6}
                textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}
                className="fill-muted-foreground text-[10px]"
              >
                {formatDate(snapshots[index].recorded_at)}
              </text>
            ))}

            {/* Series lines */}
            {visibleSeries.map((series) => {
              const path = snapshots
                .map((snapshot, index) => {
                  const value = series.pick(snapshot);
                  if (value == null) return null;
                  return `${scale.x(index).toFixed(1)},${scale.y(value).toFixed(1)}`;
                })
                .filter((point): point is string => point !== null)
                .map((point, index) => `${index === 0 ? 'M' : 'L'}${point}`)
                .join(' ');

              return (
                <path
                  key={series.key}
                  d={path}
                  fill="none"
                  stroke={series.color}
                  strokeWidth={series.key === 'market' ? 2 : 1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}

            {/* Hover crosshair */}
            {hoverIndex != null && (
              <g>
                <line
                  x1={scale.x(hoverIndex)}
                  x2={scale.x(hoverIndex)}
                  y1={PAD.top}
                  y2={PAD.top + scale.plotH}
                  stroke="hsl(var(--foreground))"
                  strokeOpacity={0.35}
                  strokeWidth={1}
                />
                {visibleSeries.map((series) => {
                  const value = series.pick(snapshots[hoverIndex]);
                  if (value == null) return null;
                  return (
                    <circle
                      key={series.key}
                      cx={scale.x(hoverIndex)}
                      cy={scale.y(value)}
                      r={3}
                      fill={series.color}
                      stroke="hsl(var(--background))"
                      strokeWidth={1.5}
                    />
                  );
                })}
              </g>
            )}
          </svg>
        )}
      </div>

      {activeSnapshot && scale && (
        <p className="text-[11px] text-muted-foreground">
          {hoverIndex != null ? '' : 'Latest: '}
          {formatDate(activeSnapshot.recorded_at, true)}
        </p>
      )}
    </section>
  );
}
