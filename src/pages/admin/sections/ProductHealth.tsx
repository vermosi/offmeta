/**
 * Product Health — the four things that answer "is the product working?".
 *
 * 1. Volume and usage (searches, sessions, searches per session)
 * 2. Arrival → search → action funnel
 * 3. Failure rate (zero-result + low-confidence) with a link to the repair queue
 * 4. Top queries
 *
 * Engineering diagnostics (translation source, confidence distribution,
 * deterministic coverage, Scryfall hit rate) deliberately live in
 * Search → Confidence Monitor / Quality Benchmark and System, not here.
 * @module pages/admin/sections/ProductHealth
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Loader2,
  Search,
  SearchX,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { StatCard } from '@/pages/admin-analytics/components/AnalyticsPrimitives';
import { ConversionFunnelPanel } from '@/pages/admin-analytics/components/ConversionFunnelPanel';
import {
  ConsoleHeading,
  ConsolePanel,
  EmptyRow,
} from '@/pages/admin/components/console-ui';
import { logger } from '@/lib/core/logger';
import type { AnalyticsData } from '@/pages/admin-analytics/types';

interface UsageSnapshot {
  sessions: number;
  searchesPerSession: number;
  zeroResults: number;
  searchEvents: number;
}

function useUsageSnapshot(days: number) {
  const [snapshot, setSnapshot] = useState<UsageSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const since = new Date();
        since.setDate(since.getDate() - days);
        const sinceStr = since.toISOString();

        const [searches, failures] = await Promise.all([
          supabase
            .from('analytics_events')
            .select('session_id')
            .eq('event_type', 'search')
            .gte('created_at', sinceStr)
            .limit(1000),
          supabase
            .from('analytics_events')
            .select('id')
            .eq('event_type', 'search_failure')
            .gte('created_at', sinceStr)
            .limit(1000),
        ]);

        if (searches.error) throw searches.error;
        if (failures.error) throw failures.error;
        if (cancelled) return;

        const searchEvents = searches.data ?? [];
        const sessions = new Set(
          searchEvents.map((e) => e.session_id ?? 'unknown'),
        ).size;

        setSnapshot({
          sessions,
          searchesPerSession:
            sessions > 0
              ? Math.round((searchEvents.length / sessions) * 10) / 10
              : 0,
          zeroResults: failures.data?.length ?? 0,
          searchEvents: searchEvents.length,
        });
      } catch (error) {
        if (!cancelled) {
          logger.error('Product health usage snapshot failed', { error });
          setSnapshot(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [days]);

  return { snapshot, isLoading };
}

interface ProductHealthProps {
  data: AnalyticsData | null;
  days: number;
}

export function ProductHealth({ data, days }: ProductHealthProps) {
  const { snapshot, isLoading } = useUsageSnapshot(days);

  if (!data) {
    return (
      <div className="space-y-6">
        <ConsoleHeading
          index="01"
          title="Product health"
          note="Usage, arrival → search → action, and where search fails."
        />
        <ConsolePanel>
          <EmptyRow>No analytics data in this window.</EmptyRow>
        </ConsolePanel>
      </div>
    );
  }

  const totalSearchSignals =
    (snapshot?.searchEvents ?? 0) + (snapshot?.zeroResults ?? 0);
  const zeroResultRate =
    totalSearchSignals > 0
      ? Math.round(((snapshot?.zeroResults ?? 0) / totalSearchSignals) * 100)
      : 0;
  const buckets = data.confidenceBuckets ?? { high: 0, medium: 0, low: 0 };
  const confidenceTotal = buckets.high + buckets.medium + buckets.low;
  const lowConfidenceRate =
    confidenceTotal > 0 ? Math.round((buckets.low / confidenceTotal) * 100) : 0;
  const dailyVolume = Object.entries(data.dailyVolume ?? {}).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const maxDay = Math.max(1, ...dailyVolume.map(([, count]) => count));

  return (
    <div className="space-y-6">
      <ConsoleHeading
        index="01"
        title="Product health"
        note="Usage, arrival → search → action, and where search fails."
      />

      {/* 1. Volume and usage */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={TrendingUp}
          label="Searches"
          value={data.summary.totalSearches.toLocaleString()}
          subtext={`Last ${data.summary.days} days`}
        />
        <StatCard
          icon={Users}
          label="Sessions"
          value={isLoading ? '—' : (snapshot?.sessions.toLocaleString() ?? '—')}
          subtext="Distinct search sessions"
        />
        <StatCard
          icon={Search}
          label="Searches / session"
          value={isLoading ? '—' : (snapshot?.searchesPerSession ?? '—')}
          subtext="Higher means refining, not bouncing"
        />
        <StatCard
          icon={SearchX}
          label="Failure rate"
          value={isLoading ? '—' : `${zeroResultRate}%`}
          subtext={`${lowConfidenceRate}% low confidence`}
          variant={
            zeroResultRate < 5
              ? 'success'
              : zeroResultRate < 15
                ? 'warning'
                : 'danger'
          }
        />
      </div>

      <div className="surface-elevated p-5 border border-border">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4" aria-hidden="true" />
          Daily search volume
        </h2>
        {dailyVolume.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No searches in this window.
          </p>
        ) : (
          <div className="space-y-2">
            {dailyVolume.map(([day, count]) => (
              <div key={day} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-20 tabular-nums flex-shrink-0">
                  {day}
                </span>
                <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                  <div
                    className="h-full bg-primary/70 rounded"
                    style={{ width: `${(count / maxDay) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                  {count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Funnel */}
      <ConversionFunnelPanel days={days} />

      {/* 3. Failure rate → action */}
      <div className="surface-elevated p-5 border border-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            {isLoading && (
              <Loader2
                className="h-4 w-4 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
            )}
            <SearchX
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="font-medium text-foreground">
              {snapshot?.zeroResults ?? 0} zero-result searches
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {buckets.low} low-confidence translations
            </span>
          </div>
          <Link
            to="/admin/search/repair"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Open repair queue
          </Link>
        </div>
      </div>

      {/* 4. Top queries */}
      {data.popularQueries && data.popularQueries.length > 0 && (
        <div className="surface-elevated p-5 border border-border">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Search className="h-4 w-4" aria-hidden="true" />
            Top queries
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Query
                  </th>
                  <th className="text-right py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Count
                  </th>
                  <th className="text-right py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Confidence
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.popularQueries.slice(0, 15).map((pq) => (
                  <tr
                    key={pq.query}
                    className="border-b border-border/30 hover:bg-muted/20"
                  >
                    <td className="py-2 font-medium truncate max-w-[420px]">
                      {pq.query}
                    </td>
                    <td className="py-2 text-right tabular-nums">{pq.count}</td>
                    <td className="py-2 text-right">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${
                          pq.avg_confidence >= 0.8
                            ? 'bg-success/10 text-success'
                            : pq.avg_confidence >= 0.6
                              ? 'bg-warning/10 text-warning'
                              : 'bg-destructive/10 text-destructive'
                        }`}
                      >
                        {Math.round(pq.avg_confidence * 100)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
