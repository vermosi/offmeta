/**
 * Mini-widget showing top 3 price gainers with daily/weekly tabs.
 * Displayed on the homepage discovery section.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, ArrowUpRight, Flame } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarketTrends } from '@/hooks/useMarketTrends';

type Period = 'daily' | 'weekly';

export function TrendingCardsWidget() {
  const [period, setPeriod] = useState<Period>('daily');
  const daysBack = period === 'daily' ? 1 : 7;
  const { gainers, isLoading, isDemo } = useMarketTrends(daysBack);
  const top3 = gainers.slice(0, 3);

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-5 space-y-4">
          <Skeleton className="h-6 w-40" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
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

        {/* Cards list */}
        <div className="divide-y divide-border">
          {top3.map((mover, idx) => (
            <div
              key={mover.card_name}
              className="flex items-center justify-between px-5 py-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-bold text-muted-foreground w-4 text-center">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {mover.card_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ${mover.current_price.toFixed(2)}
                  </p>
                </div>
              </div>
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary border-0 font-mono text-xs shrink-0"
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                +{Math.abs(mover.change_percent).toFixed(1)}%
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
