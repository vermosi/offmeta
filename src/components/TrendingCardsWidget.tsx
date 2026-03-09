/**
 * Mini-widget showing top 3 price gainers & losers with daily/weekly tabs.
 * Displayed on the homepage discovery section.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, ArrowUpRight, Flame } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarketTrends, type PriceMover } from '@/hooks/useMarketTrends';

type Period = 'daily' | 'weekly';

function MoverRow({ mover, idx, direction, onSearch }: { mover: PriceMover; idx: number; direction: 'up' | 'down'; onSearch?: (q: string) => void }) {
  const isUp = direction === 'up';
  return (
    <div className="flex items-center justify-between px-5 py-2.5 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs font-bold text-muted-foreground w-4 text-center">
          {idx + 1}
        </span>
        <div className="min-w-0">
          <button
            onClick={() => onSearch?.(mover.card_name)}
            className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors text-left"
          >
            {mover.card_name}
          </button>
          <p className="text-xs text-muted-foreground">
            ${mover.current_price.toFixed(2)}
          </p>
        </div>
      </div>
      <Badge
        variant="secondary"
        className={`border-0 font-mono text-xs shrink-0 ${
          isUp ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
        }`}
      >
        {isUp ? (
          <TrendingUp className="h-3 w-3 mr-1" />
        ) : (
          <TrendingDown className="h-3 w-3 mr-1" />
        )}
        {isUp ? '+' : ''}{mover.change_percent.toFixed(1)}%
      </Badge>
    </div>
  );
}

export function TrendingCardsWidget({ onSearch }: { onSearch?: (query: string) => void }) {
  const [period, setPeriod] = useState<Period>('daily');
  const daysBack = period === 'daily' ? 1 : 7;
  const { gainers, losers, isLoading, isDemo } = useMarketTrends(daysBack);
  const topGainers = gainers.slice(0, 3);
  const topLosers = losers.slice(0, 3);

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-5 space-y-4">
          <Skeleton className="h-6 w-40" />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Flame className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground text-sm tracking-tight">
              Trending Cards
            </h3>
            {isDemo && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Demo
              </Badge>
            )}
          </div>
          <Link
            to="/market"
            className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
          >
            View all
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Period tabs */}
        <div className="flex gap-1 px-5 pb-3">
          {(['daily', 'weekly'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                period === p
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {p === 'daily' ? '24h' : '7d'}
            </button>
          ))}
        </div>

        {/* Gainers */}
        <div className="px-5 pt-1 pb-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-primary" />
            Gainers
          </p>
        </div>
        <div className="divide-y divide-border">
          {topGainers.map((mover, idx) => (
            <MoverRow key={mover.card_name} mover={mover} idx={idx} direction="up" />
          ))}
        </div>

        {/* Losers */}
        <div className="px-5 pt-3 pb-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <TrendingDown className="h-3 w-3 text-destructive" />
            Losers
          </p>
        </div>
        <div className="divide-y divide-border">
          {topLosers.map((mover, idx) => (
            <MoverRow key={mover.card_name} mover={mover} idx={idx} direction="down" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
