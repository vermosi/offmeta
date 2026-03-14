/**
 * Tiny SVG sparkline showing price trend over time.
 * Pure presentational — accepts pre-fetched price data points.
 * @module components/PriceSparkline
 */

import { memo, useMemo } from 'react';

export interface SparklinePoint {
  price: number;
  date: string;
}

interface PriceSparklineProps {
  data: SparklinePoint[];
  width?: number;
  height?: number;
  className?: string;
}

export const PriceSparkline = memo(function PriceSparkline({
  data,
  width = 48,
  height = 16,
  className = '',
}: PriceSparklineProps) {
  const pathData = useMemo(() => {
    if (data.length < 2) return null;

    const prices = data.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    const padding = 1;
    const plotW = width - padding * 2;
    const plotH = height - padding * 2;

    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * plotW;
      const y = padding + plotH - ((d.price - min) / range) * plotH;
      return { x, y };
    });

    const d = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');

    return { d, points, isUp: prices[prices.length - 1] >= prices[0] };
  }, [data, width, height]);

  if (!pathData) return null;

  const strokeColor = pathData.isUp
    ? 'hsl(var(--chart-2, 142 71% 45%))' // green
    : 'hsl(var(--destructive, 0 84% 60%))'; // red

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      <path
        d={pathData.d}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={pathData.points[pathData.points.length - 1].x}
        cy={pathData.points[pathData.points.length - 1].y}
        r={1.5}
        fill={strokeColor}
      />
    </svg>
  );
});
