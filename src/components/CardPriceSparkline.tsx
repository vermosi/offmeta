/**
 * Price sparkline that fetches its own 30-day history for a card name.
 * @module components/CardPriceSparkline
 */

import { useMemo } from 'react';
import { PriceSparkline, type SparklinePoint } from '@/components/PriceSparkline';
import { usePriceHistory } from '@/hooks/usePriceHistory';

interface CardPriceSparklineProps {
  cardName: string;
  width?: number;
  height?: number;
  className?: string;
}

export function CardPriceSparkline({
  cardName,
  width,
  height,
  className,
}: CardPriceSparklineProps) {
  const { data } = usePriceHistory(cardName);

  const points = useMemo<SparklinePoint[]>(
    () =>
      (data ?? [])
        .filter((snapshot) => typeof snapshot.price_usd === 'number' && snapshot.price_usd !== null)
        .map((snapshot) => ({
          price: Number(snapshot.price_usd),
          date: snapshot.recorded_at,
        })),
    [data],
  );

  if (points.length < 2) return null;

  return (
    <PriceSparkline data={points} width={width} height={height} className={className} />
  );
}
