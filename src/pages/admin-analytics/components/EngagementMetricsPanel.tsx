/**
 * Engagement Metrics Panel for Admin Analytics.
 * Shows searches_per_session distribution and zero-result query rate.
 * Queries analytics_events directly using the admin's JWT.
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Users, SearchX, BarChart3, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { BarRow, StatCard } from './AnalyticsPrimitives';

interface SessionBucket {
  label: string;
  count: number;
}

interface EngagementData {
  totalSessions: number;
  avgSearchesPerSession: number;
  medianSearchesPerSession: number;
  sessionBuckets: SessionBucket[];
  zeroResultCount: number;
  totalSearchEvents: number;
  topZeroResultQueries: Array<{ query: string; count: number }>;
}

export function EngagementMetricsPanel({ days }: { days: number }) {
  const [data, setData] = useState<EngagementData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceStr = since.toISOString();

      // Fetch search events for session distribution
      const [searchEventsRes, failureEventsRes] = await Promise.all([
        supabase
          .from('analytics_events')
          .select('session_id, event_data')
          .eq('event_type', 'search')
          .gte('created_at', sinceStr)
          .limit(1000),
        supabase
          .from('analytics_events')
          .select('event_data')
          .eq('event_type', 'search_failure')
          .gte('created_at', sinceStr)
          .limit(1000),
      ]);

      if (searchEventsRes.error) throw searchEventsRes.error;
      if (failureEventsRes.error) throw failureEventsRes.error;

      const searchEvents = searchEventsRes.data ?? [];
      const failureEvents = failureEventsRes.data ?? [];

      // Group searches by session_id
      const sessionCounts = new Map<string, number>();
      for (const event of searchEvents) {
        const sid = event.session_id || 'unknown';
        sessionCounts.set(sid, (sessionCounts.get(sid) || 0) + 1);
      }

      const counts = Array.from(sessionCounts.values()).sort((a, b) => a - b);
      const totalSessions = counts.length;
      const avgSearches =
        totalSessions > 0
          ? Math.round(
              (counts.reduce((a, b) => a + b, 0) / totalSessions) * 10,
            ) / 10
          : 0;
      const medianSearches =
        totalSessions > 0 ? counts[Math.floor(totalSessions / 2)] : 0;

      // Build distribution buckets
      const bucketDefs = [
        { label: '1 search', min: 1, max: 1 },
        { label: '2-3 searches', min: 2, max: 3 },
        { label: '4-6 searches', min: 4, max: 6 },
        { label: '7-10 searches', min: 7, max: 10 },
        { label: '11+ searches', min: 11, max: Infinity },
      ];

      const sessionBuckets: SessionBucket[] = bucketDefs.map((def) => ({
        label: def.label,
        count: counts.filter((c) => c >= def.min && c <= def.max).length,
      }));

      // Zero-result queries
      const zeroResultCount = failureEvents.length;
      const totalSearchEvents = searchEvents.length + zeroResultCount;

      // Top zero-result queries by frequency
      const queryFreq = new Map<string, number>();
      for (const event of failureEvents) {
        const eventData = event.event_data as Record<string, unknown> | null;
        const q = (eventData?.query as string) || 'unknown';
        queryFreq.set(q, (queryFreq.get(q) || 0) + 1);
      }
      const topZeroResultQueries = Array.from(queryFreq.entries())
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setData({
        totalSessions,
        avgSearchesPerSession: avgSearches,
        medianSearchesPerSession: medianSearches,
        sessionBuckets,
        zeroResultCount,
        totalSearchEvents,
        topZeroResultQueries,
      });
    } catch {
      toast.error('Failed to load engagement metrics');
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="surface-elevated border border-border p-6 flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Loading engagement metrics…
        </span>
      </div>
    );
  }

  if (!data) return null;

  const zeroResultRate =
    data.totalSearchEvents > 0
      ? Math.round((data.zeroResultCount / data.totalSearchEvents) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        Engagement Metrics
      </h3>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Users}
          label="Total Sessions"
          value={data.totalSessions.toLocaleString()}
          subtext={`Last ${days} days`}
        />
        <StatCard
          icon={BarChart3}
          label="Avg Searches/Session"
          value={data.avgSearchesPerSession.toString()}
          subtext={`Median: ${data.medianSearchesPerSession}`}
          variant={
            data.avgSearchesPerSession >= 3
              ? 'success'
              : data.avgSearchesPerSession >= 1.5
                ? 'warning'
                : 'danger'
          }
        />
        <StatCard
          icon={SearchX}
          label="Zero-Result Searches"
          value={data.zeroResultCount.toLocaleString()}
          subtext={`${zeroResultRate}% of all searches`}
          variant={
            zeroResultRate <= 5
              ? 'success'
              : zeroResultRate <= 15
                ? 'warning'
                : 'danger'
          }
        />
        <StatCard
          icon={TrendingDown}
          label="Zero-Result Rate"
          value={`${zeroResultRate}%`}
          subtext={`${data.totalSearchEvents} total searches`}
          variant={
            zeroResultRate <= 5
              ? 'success'
              : zeroResultRate <= 15
                ? 'warning'
                : 'danger'
          }
        />
      </div>

      {/* Two-column: session distribution + top zero-result queries */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Session depth distribution */}
        <div className="surface-elevated border border-border p-4 sm:p-5 space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Searches per Session Distribution
          </h4>
          <div className="space-y-2">
            {data.sessionBuckets.map((bucket) => (
              <BarRow
                key={bucket.label}
                label={bucket.label}
                value={bucket.count}
                total={data.totalSessions}
                color="bg-primary"
              />
            ))}
          </div>
          {data.totalSessions === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No session data available
            </p>
          )}
        </div>

        {/* Top zero-result queries */}
        <div className="surface-elevated border border-border p-4 sm:p-5 space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Top Zero-Result Queries
          </h4>
          {data.topZeroResultQueries.length > 0 ? (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {data.topZeroResultQueries.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0"
                >
                  <span className="text-foreground truncate mr-2 font-mono text-xs">
                    {item.query}
                  </span>
                  <span className="text-muted-foreground tabular-nums text-xs flex-shrink-0">
                    {item.count}×
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">
              No zero-result queries — great! 🎉
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
