/**
 * Price sparkline that fetches its own 30-day history for a card name.
 * @module components/CardPriceSparkline
 */

import { useMemo, useState } from 'react';
import { PriceSparkline, type SparklinePoint } from '@/components/PriceSparkline';
import { usePriceHistory } from '@/hooks/usePriceHistory';
import { cn } from '@/lib/utils';

interface CardPriceSparklineProps {
  cardName: string;
  width?: number;
  height?: number;
  className?: string;
}

type PriceSeries = 'low' | 'average' | 'market' | 'foil';

const SERIES_LABELS: Record<PriceSeries, string> = {
  low: 'Low',
  average: 'Average',
  market: 'Market',
  foil: 'Foil',
};

export function CardPriceSparkline({
  cardName,
  width,
  height,
  className,
}: CardPriceSparklineProps) {
  const { data } = usePriceHistory(cardName);
  const [series, setSeries] = useState<PriceSeries>('market');

  const points = useMemo<SparklinePoint[]>(
    () => {
      const pickPrice = (snapshot: (typeof data)[number]) => {
        switch (series) {
          case 'low':
            return snapshot.price_low;
          case 'average':
            return snapshot.price_average;
          case 'market':
            return snapshot.price_market ?? snapshot.price_usd;
          case 'foil':
            return snapshot.price_foil ?? snapshot.price_usd_foil;
        }
      };

      return (data ?? [])
        .map((snapshot) => {
          const price = pickPrice(snapshot);
          return price == null ? null : { price: Number(price), date: snapshot.recorded_at };
        })
        .filter((point): point is SparklinePoint => point !== null);
    },
    [data, series],
  );

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex rounded-md border border-border bg-muted p-0.5 text-[10px]">
        {(Object.keys(SERIES_LABELS) as PriceSeries[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setSeries(item)}
            className={cn(
              'rounded px-1.5 py-0.5 transition-colors',
              series === item
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {SERIES_LABELS[item]}
          </button>
        ))}
      </div>
      {points.length >= 2 ? (
        <PriceSparkline data={points} width={width} height={height} />
      ) : (
        <span className="text-[10px] text-muted-foreground">Coming soon</span>
      )}
    </div>
  );
}
