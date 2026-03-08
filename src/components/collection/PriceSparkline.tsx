/**
 * Tiny inline sparkline showing 30-day price trend for a collection card.
 * @module components/collection/PriceSparkline
 */

import { usePriceHistory, computePriceTrend } from '@/hooks/usePriceHistory';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PriceSparklineProps {
  cardName: string;
}

export function PriceSparkline({ cardName }: PriceSparklineProps) {
  const { data: snapshots } = usePriceHistory(cardName);

  if (!snapshots || snapshots.length < 2) return null;

  const trend = computePriceTrend(snapshots);
  const prices = snapshots
    .map((s) => s.price_usd)
    .filter((p): p is number => p != null && p > 0);

  if (prices.length < 2) return null;

  // Build SVG sparkline
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const width = 48;
  const height = 16;

  const points = prices
    .map((p, i) => {
      const x = (i / (prices.length - 1)) * width;
      const y = height - ((p - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  const trendColor =
    trend.direction === 'up'
      ? 'text-green-500'
      : trend.direction === 'down'
        ? 'text-red-500'
        : 'text-muted-foreground';

  const TrendIcon =
    trend.direction === 'up'
      ? TrendingUp
      : trend.direction === 'down'
        ? TrendingDown
        : Minus;

  return (
    <div className="flex items-center gap-1 shrink-0" title={`${trend.changePercent > 0 ? '+' : ''}${trend.changePercent}% (30d)`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={trendColor}
        aria-hidden="true"
      >
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <TrendIcon className={`h-3 w-3 ${trendColor}`} />
    </div>
  );
}
