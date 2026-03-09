/**
 * Market Trends page — shows weekly biggest price gainers and losers.
 * @module pages/MarketTrends
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PriceSparkline } from '@/components/collection/PriceSparkline';
import { useMarketTrends, type PriceMover } from '@/hooks/useMarketTrends';
import { cardNameToSlug } from '@/lib/card-slug';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

const TIME_RANGES = [
  { label: '7d', value: 7 },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
] as const;

function MoverRow({ mover }: { mover: PriceMover }) {
  const isUp = mover.direction === 'up';
  const slug = cardNameToSlug(mover.card_name);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/50 px-4 py-3 transition-colors hover:bg-muted/40">
      <div className="flex-1 min-w-0">
        <Link
          to={`/cards/${slug}`}
          className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block"
        >
          {mover.card_name}
        </Link>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          <span>${mover.previous_price.toFixed(2)}</span>
          <span>→</span>
          <span className="font-medium text-foreground">${mover.current_price.toFixed(2)}</span>
        </div>
      </div>

      <PriceSparkline cardName={mover.card_name} demo />

      <Badge
        variant={isUp ? 'success' : 'destructive'}
        size="sm"
        className="shrink-0 tabular-nums"
      >
        {isUp ? '+' : ''}{mover.change_percent.toFixed(1)}%
      </Badge>
    </div>
  );
}

function MoverSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-4 w-12" />
      <Skeleton className="h-5 w-14 rounded-md" />
    </div>
  );
}

export default function MarketTrends() {
  const [daysBack, setDaysBack] = useState(7);
  const { gainers, losers, isLoading, isDemo } = useMarketTrends(daysBack);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container max-w-6xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Market Trends
            </h1>
            <p className="text-muted-foreground mt-1">
              Biggest price movers over the last {daysBack} days
            </p>
          </div>

          {/* Time range selector */}
          <div className="flex items-center gap-1 rounded-lg border border-border p-1 bg-muted/30 self-start">
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
        </div>

        {/* Demo banner */}
        {isDemo && !isLoading && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 mb-6 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Showing sample data — real trends will appear as price history accumulates.
            </span>
          </div>
        )}

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gainers */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Biggest Gainers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => <MoverSkeleton key={i} />)
                : gainers.length === 0
                  ? <p className="text-sm text-muted-foreground py-4 text-center">No gainers found for this period</p>
                  : gainers.map((m) => <MoverRow key={m.card_name} mover={m} />)}
            </CardContent>
          </Card>

          {/* Losers */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingDown className="h-5 w-5 text-red-500" />
                Biggest Losers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => <MoverSkeleton key={i} />)
                : losers.length === 0
                  ? <p className="text-sm text-muted-foreground py-4 text-center">No losers found for this period</p>
                  : losers.map((m) => <MoverRow key={m.card_name} mover={m} />)}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
