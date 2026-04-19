/**
 * Analytics charts and stats section.
 *
 * Renders: summary stat cards, response percentiles, source breakdown,
 * confidence distribution, deterministic coverage trend, daily volume,
 * popular queries, event types, and low-confidence queries.
 */

import {
  TrendingUp,
  Clock,
  Target,
  AlertTriangle,
  Zap,
  ShieldAlert,
  Search,
  Gauge,
  BarChart3,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BarRow, StatCard } from '@/pages/admin-analytics/components/AnalyticsPrimitives';
import { EngagementMetricsPanel } from '@/pages/admin-analytics/components/EngagementMetricsPanel';
import { ConversionFunnelPanel } from '@/pages/admin-analytics/components/ConversionFunnelPanel';
import { EdgeFunctionTriggerPanel } from '@/pages/admin-analytics/components/EdgeFunctionTriggerPanel';
import { SystemStatusPanel } from '@/pages/admin-analytics/components/SystemStatusPanel';
import { HitRatePanel } from '@/pages/admin-analytics/components/HitRatePanel';
import { AICostPanel } from '@/pages/admin-analytics/components/AICostPanel';
import { AuthFailuresPanel } from '@/pages/admin-analytics/components/AuthFailuresPanel';
import { RumPanel } from '@/pages/admin-analytics/components/RumPanel';
import type { AnalyticsData } from '@/pages/admin-analytics/types';

interface AnalyticsChartsSectionProps {
  data: AnalyticsData;
  days: number;
}

export function AnalyticsChartsSection({ data, days }: AnalyticsChartsSectionProps) {
  return (
    <div className="space-y-8">
      {/* Summary cards */}
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

      {/* Response time percentiles */}
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

      <RumPanel days={days} />
      <EngagementMetricsPanel days={days} />
      <ConversionFunnelPanel days={days} />
      <EdgeFunctionTriggerPanel />
      <SystemStatusPanel />
      <HitRatePanel days={days} />
      <AICostPanel days={days} />
      <AuthFailuresPanel days={days} />

      {/* Source breakdown + confidence */}
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
            <BarRow label="High (≥80%)" value={data.confidenceBuckets.high} total={data.summary.totalSearches} color="bg-success" />
            <BarRow label="Medium (60-79%)" value={data.confidenceBuckets.medium} total={data.summary.totalSearches} color="bg-warning" />
            <BarRow label="Low (<60%)" value={data.confidenceBuckets.low} total={data.summary.totalSearches} color="bg-destructive" />
          </div>
        </div>
      </div>

      {/* Deterministic Coverage Trend */}
      {Object.keys(data.deterministicCoverage).length > 1 && (
        <div className="surface-elevated p-5 border border-border">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Deterministic Coverage Trend
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            Percentage of queries handled without AI (deterministic + pattern match)
          </p>
          <div className="space-y-2">
            {Object.entries(data.deterministicCoverage)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([day, pct]) => (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-20 tabular-nums flex-shrink-0">{day}</span>
                  <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-success/60 rounded" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">{pct}%</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Daily volume */}
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
                  <span className="text-xs text-muted-foreground w-20 tabular-nums flex-shrink-0">{day}</span>
                  <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                    <div
                      className="h-full bg-primary/70 rounded"
                      style={{ width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">{count}</span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Popular Queries */}
      {data.popularQueries && data.popularQueries.length > 0 && (
        <div className="surface-elevated p-5 border border-border">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Search className="h-4 w-4" />
            Popular Queries (Top 20)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">#</th>
                  <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Query</th>
                  <th className="text-right py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Count</th>
                  <th className="text-right py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Conf</th>
                  <th className="text-right py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Source</th>
                </tr>
              </thead>
              <tbody>
                {data.popularQueries.map((pq, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="py-2 text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="py-2 font-medium truncate max-w-[300px]">{pq.query}</td>
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
                    <td className="py-2 text-right text-xs text-muted-foreground">{pq.primary_source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Event type breakdown */}
      {Object.keys(data.eventBreakdown).length > 0 && (
        <div className="surface-elevated p-5 border border-border">
          <h2 className="text-sm font-semibold text-foreground mb-4">Event Types</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.eventBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <Badge key={type} variant="secondary" className="text-xs gap-1.5 py-1">
                  {type}
                  <span className="text-muted-foreground tabular-nums">{count}</span>
                </Badge>
              ))}
          </div>
        </div>
      )}

      {/* Low confidence queries */}
      {data.lowConfidenceQueries.length > 0 && (
        <div className="surface-elevated p-5 border border-border">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-warning" />
            Low Confidence Queries (for review)
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {data.lowConfidenceQueries.map((q, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground truncate">"{q.query}"</p>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] flex-shrink-0 ${
                      (q.confidence || 0) < 0.4
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-warning/10 text-warning'
                    }`}
                  >
                    {Math.round((q.confidence || 0) * 100)}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono truncate">→ {q.translated}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{q.source}</span>
                  <span>·</span>
                  <span>{new Date(q.time).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
