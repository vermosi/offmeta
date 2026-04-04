import {
  AlertTriangle,
  BarChart3,
  Clock,
  Gauge,
  Search,
  ShieldAlert,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  BarRow,
  StatCard,
} from '@/pages/admin-analytics/components/AnalyticsPrimitives';
import { AICostPanel } from '@/pages/admin-analytics/components/AICostPanel';
import { AuthFailuresPanel } from '@/pages/admin-analytics/components/AuthFailuresPanel';
import { ConversionFunnelPanel } from '@/pages/admin-analytics/components/ConversionFunnelPanel';
import { EngagementMetricsPanel } from '@/pages/admin-analytics/components/EngagementMetricsPanel';
import { HitRatePanel } from '@/pages/admin-analytics/components/HitRatePanel';
import { SystemStatusPanel } from '@/pages/admin-analytics/components/SystemStatusPanel';
import type { AnalyticsData } from '@/pages/admin-analytics/types';

interface AdminAnalyticsDashboardProps {
  data: AnalyticsData;
  days: number;
}

export function AdminAnalyticsDashboard({
  data,
  days,
}: AdminAnalyticsDashboardProps) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={TrendingUp}
          label="Total Searches"
          value={data.summary.totalSearches.toLocaleString()}
          subtext={`Last ${data.summary.days} days`}
        />
        <StatCard
          icon={Target}
          label="Avg Confidence"
          value={`${Math.round(data.summary.avgConfidence * 100)}%`}
          variant={
            data.summary.avgConfidence >= 0.8
              ? 'success'
              : data.summary.avgConfidence >= 0.6
                ? 'warning'
                : 'danger'
          }
        />
        <StatCard
          icon={Clock}
          label="Avg Response"
          value={`${data.summary.avgResponseTime}ms`}
          variant={data.summary.avgResponseTime < 1000 ? 'success' : 'warning'}
        />
        <StatCard
          icon={AlertTriangle}
          label="Fallback Rate"
          value={`${data.summary.fallbackRate}%`}
          variant={
            data.summary.fallbackRate < 10
              ? 'success'
              : data.summary.fallbackRate < 25
                ? 'warning'
                : 'danger'
          }
        />
      </div>

      {data.responsePercentiles && (
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <StatCard
            icon={Gauge}
            label="P50 Response"
            value={`${data.responsePercentiles.p50}ms`}
            subtext="Median"
            variant={data.responsePercentiles.p50 < 500 ? 'success' : 'warning'}
          />
          <StatCard
            icon={Gauge}
            label="P95 Response"
            value={`${data.responsePercentiles.p95}ms`}
            subtext="95th percentile"
            variant={
              data.responsePercentiles.p95 < 2000
                ? 'success'
                : data.responsePercentiles.p95 < 5000
                  ? 'warning'
                  : 'danger'
            }
          />
          <StatCard
            icon={Gauge}
            label="P99 Response"
            value={`${data.responsePercentiles.p99}ms`}
            subtext="99th percentile"
            variant={data.responsePercentiles.p99 < 5000 ? 'success' : 'danger'}
          />
        </div>
      )}

      <EngagementMetricsPanel days={days} />
      <ConversionFunnelPanel days={days} />
      <SystemStatusPanel />
      <HitRatePanel days={days} />
      <AICostPanel days={days} />
      <AuthFailuresPanel days={days} />

      <div className="grid md:grid-cols-2 gap-4">
        <div className="surface-elevated p-5 border border-border">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Translation Source
          </h2>
          <div className="space-y-3">
            {Object.entries(data.sourceBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([source, count]) => (
                <BarRow
                  key={source}
                  label={source}
                  value={count}
                  total={data.summary.totalSearches}
                  color={
                    source === 'deterministic'
                      ? 'bg-success'
                      : source === 'cache'
                        ? 'bg-primary'
                        : source === 'ai'
                          ? 'bg-accent'
                          : source === 'pattern_match'
                            ? 'bg-success/70'
                            : 'bg-warning'
                  }
                />
              ))}
          </div>
        </div>

        <div className="surface-elevated p-5 border border-border">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Confidence Distribution
          </h2>
          <div className="space-y-3">
            <BarRow
              label="High (≥80%)"
              value={data.confidenceBuckets.high}
              total={data.summary.totalSearches}
              color="bg-success"
            />
            <BarRow
              label="Medium (60-79%)"
              value={data.confidenceBuckets.medium}
              total={data.summary.totalSearches}
              color="bg-warning"
            />
            <BarRow
              label="Low (<60%)"
              value={data.confidenceBuckets.low}
              total={data.summary.totalSearches}
              color="bg-destructive"
            />
          </div>
        </div>
      </div>

      <div className="surface-elevated p-5 border border-border">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Daily Search Volume
        </h2>
        <div className="space-y-2">
          {Object.entries(data.dailyVolume)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([day, count]) => {
              const maxCount = Math.max(...Object.values(data.dailyVolume));
              return (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-20 tabular-nums flex-shrink-0">
                    {day}
                  </span>
                  <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                    <div
                      className="h-full bg-primary/70 rounded"
                      style={{
                        width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {data.popularQueries?.length > 0 && (
        <div className="surface-elevated p-5 border border-border">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Search className="h-4 w-4" />
            Popular Queries (Top 20)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {data.popularQueries.map((pq, i) => (
                  <tr
                    key={`${pq.query}-${i}`}
                    className="border-b border-border/30"
                  >
                    <td className="py-2">{i + 1}</td>
                    <td className="py-2">{pq.query}</td>
                    <td className="py-2 text-right">{pq.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.lowConfidenceQueries.length > 0 && (
        <div className="surface-elevated p-5 border border-border">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-warning" />
            Low Confidence Queries
          </h2>
          <div className="space-y-2">
            {data.lowConfidenceQueries.slice(0, 10).map((query, index) => (
              <div
                key={`${query.query}-${index}`}
                className="flex items-center justify-between gap-2"
              >
                <p className="text-xs truncate">{query.query}</p>
                <Badge variant="secondary">
                  {Math.round((query.confidence || 0) * 100)}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
