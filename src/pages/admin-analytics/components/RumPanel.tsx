/**
 * Real User Monitoring (RUM) panel.
 * Aggregates Core Web Vitals (LCP, CLS, INP, FID) from real visitors over the
 * selected time window and displays p50 / p95 percentiles per metric.
 * Excludes internal traffic (is_internal: true) by default.
 */

import { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type VitalName = 'LCP' | 'CLS' | 'INP' | 'FID';

interface VitalRow {
  event_data: {
    name?: string;
    value?: number;
    is_internal?: boolean;
  } | null;
  session_id: string | null;
}

interface VitalStats {
  p50: number;
  p75: number;
  p95: number;
  count: number;
  goodPct: number;
}

const EMPTY: Record<VitalName, VitalStats> = {
  LCP: { p50: 0, p75: 0, p95: 0, count: 0, goodPct: 0 },
  CLS: { p50: 0, p75: 0, p95: 0, count: 0, goodPct: 0 },
  INP: { p50: 0, p75: 0, p95: 0, count: 0, goodPct: 0 },
  FID: { p50: 0, p75: 0, p95: 0, count: 0, goodPct: 0 },
};

const THRESHOLDS: Record<VitalName, { good: number; poor: number; unit: string; format: (n: number) => string }> = {
  LCP: { good: 2500, poor: 4000, unit: 'ms', format: (n) => `${Math.round(n)}ms` },
  CLS: { good: 0.1, poor: 0.25, unit: '', format: (n) => n.toFixed(3) },
  INP: { good: 200, poor: 500, unit: 'ms', format: (n) => `${Math.round(n)}ms` },
  FID: { good: 100, poor: 300, unit: 'ms', format: (n) => `${Math.round(n)}ms` },
};

const DESCRIPTIONS: Record<VitalName, string> = {
  LCP: 'Largest Contentful Paint',
  CLS: 'Cumulative Layout Shift',
  INP: 'Interaction to Next Paint',
  FID: 'First Input Delay (legacy)',
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (rank - lo);
}

function rate(name: VitalName, value: number): 'good' | 'needs-improvement' | 'poor' {
  const t = THRESHOLDS[name];
  if (value <= t.good) return 'good';
  if (value <= t.poor) return 'needs-improvement';
  return 'poor';
}

async function fetchRumStats(days: number): Promise<{
  stats: Record<VitalName, VitalStats>;
  sessionCount: number;
  totalSamples: number;
}> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('analytics_events')
    .select('event_data, session_id')
    .eq('event_type', 'web_vital')
    .gte('created_at', since)
    .limit(10000);

  if (error || !data) return { stats: EMPTY, sessionCount: 0, totalSamples: 0 };

  const buckets: Record<VitalName, number[]> = { LCP: [], CLS: [], INP: [], FID: [] };
  const sessions = new Set<string>();

  for (const row of data as VitalRow[]) {
    const d = row.event_data;
    if (!d || d.is_internal) continue;
    const name = d.name as VitalName | undefined;
    if (!name || !(name in buckets)) continue;
    if (typeof d.value !== 'number' || !isFinite(d.value)) continue;
    buckets[name].push(d.value);
    if (row.session_id) sessions.add(row.session_id);
  }

  const stats: Record<VitalName, VitalStats> = { ...EMPTY };
  let total = 0;
  for (const name of Object.keys(buckets) as VitalName[]) {
    const values = buckets[name].slice().sort((a, b) => a - b);
    total += values.length;
    if (values.length === 0) {
      stats[name] = { p50: 0, p75: 0, p95: 0, count: 0, goodPct: 0 };
      continue;
    }
    const goodCount = values.filter((v) => rate(name, v) === 'good').length;
    stats[name] = {
      p50: percentile(values, 50),
      p75: percentile(values, 75),
      p95: percentile(values, 95),
      count: values.length,
      goodPct: Math.round((goodCount / values.length) * 100),
    };
  }

  return { stats, sessionCount: sessions.size, totalSamples: total };
}

function VitalCard({ name, stats }: { name: VitalName; stats: VitalStats }) {
  const t = THRESHOLDS[name];
  const p75Rating = stats.count > 0 ? rate(name, stats.p75) : 'good';

  const ratingColor =
    p75Rating === 'good'
      ? 'text-emerald-500'
      : p75Rating === 'needs-improvement'
        ? 'text-amber-500'
        : 'text-red-500';

  const RatingIcon =
    p75Rating === 'good' ? CheckCircle2 : p75Rating === 'needs-improvement' ? AlertCircle : AlertTriangle;

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{name}</h3>
          <p className="text-[10px] text-muted-foreground">{DESCRIPTIONS[name]}</p>
        </div>
        {stats.count > 0 && (
          <RatingIcon className={`h-4 w-4 ${ratingColor}`} aria-label={p75Rating} />
        )}
      </div>

      {stats.count === 0 ? (
        <p className="text-xs text-muted-foreground">No samples yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">p50</p>
              <p className="text-sm font-semibold tabular-nums text-foreground">
                {t.format(stats.p50)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">p75</p>
              <p className={`text-sm font-semibold tabular-nums ${ratingColor}`}>
                {t.format(stats.p75)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">p95</p>
              <p className="text-sm font-semibold tabular-nums text-foreground">
                {t.format(stats.p95)}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{stats.count.toLocaleString()} samples</span>
            <span className="text-emerald-500 font-medium">{stats.goodPct}% good</span>
          </div>
        </>
      )}
    </div>
  );
}

export function RumPanel({ days }: { days: number }) {
  const [stats, setStats] = useState<Record<VitalName, VitalStats>>(EMPTY);
  const [sessionCount, setSessionCount] = useState(0);
  const [totalSamples, setTotalSamples] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchRumStats(days);
    setStats(result.stats);
    setSessionCount(result.sessionCount);
    setTotalSamples(result.totalSamples);
    setLoading(false);
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="surface-elevated p-5 border border-border">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Real User Monitoring — Core Web Vitals
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            p75 reflects Google's Search ranking signal. Internal traffic excluded.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={load} className="h-7 px-2" disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading && totalSamples === 0 ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : totalSamples === 0 ? (
        <p className="text-sm text-muted-foreground">
          No web vitals data yet for this window. Real visitors must load the
          published site for metrics to appear.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <VitalCard name="LCP" stats={stats.LCP} />
            <VitalCard name="INP" stats={stats.INP} />
            <VitalCard name="CLS" stats={stats.CLS} />
            <VitalCard name="FID" stats={stats.FID} />
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground">
            {totalSamples.toLocaleString()} samples across {sessionCount.toLocaleString()} sessions ({days}d)
          </p>
        </>
      )}
    </div>
  );
}
