/**
 * Live confidence monitor.
 *
 * Answers three questions on one surface:
 *  1. Are we above the 75% healthy-confidence target right now?
 *  2. Did a specific deploy move the number?
 *  3. Which query patterns are dragging it down (and can we repair them)?
 *
 * Data comes from `get_confidence_monitor`, which joins translation logs to the
 * build identifier stamped on each search. Polls every 30s while mounted.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/core/logger';
import { ConsoleHeading, ConsolePanel, EmptyRow, Metric, StatusTag } from '../components/console-ui';

const POLL_INTERVAL_MS = 30_000;
const TARGET_HEALTHY_SHARE = 75;

interface DeployRow {
  app_version: string;
  count: number;
  avg_confidence: number | null;
  healthy_share: number | null;
  zero_result_rate: number | null;
  latency_p95: number | null;
  first_seen: string;
  last_seen: string;
}

interface SourceRow {
  source: string;
  count: number;
  avg_confidence: number | null;
  low_confidence_rate: number | null;
}

interface FailingRow {
  query: string;
  count: number;
  avg_confidence: number | null;
  zero_results: number;
  last_translation: string | null;
  last_seen: string;
}

interface ConfidenceMonitorData {
  window_days: number;
  generated_at: string;
  target_healthy_share: number;
  low_threshold: number;
  total_translations: number;
  avg_confidence: number | null;
  healthy_share: number | null;
  low_confidence_rate: number | null;
  zero_result_rate: number | null;
  by_deploy: DeployRow[];
  by_source: SourceRow[];
  top_failing: FailingRow[];
}

function pct(value: number | null | undefined): string {
  return value == null ? '—' : `${value}%`;
}

function conf(value: number | null | undefined): string {
  return value == null ? '—' : value.toFixed(2);
}

function ms(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;
}

function shortTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function shareTone(share: number | null): 'neutral' | 'good' | 'warn' | 'bad' {
  if (share == null) return 'neutral';
  if (share >= TARGET_HEALTHY_SHARE) return 'good';
  if (share >= TARGET_HEALTHY_SHARE - 10) return 'warn';
  return 'bad';
}

export function ConfidenceMonitor({ days }: { days: number }) {
  const [data, setData] = useState<ConfidenceMonitorData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const { data: raw, error: rpcError } = await supabase.rpc(
      'get_confidence_monitor' as never,
      { days_back: days, deploy_limit: 8, low_threshold: 0.75 } as never,
    );
    if (!isMounted.current) return;
    if (rpcError) {
      logger.warn('[admin-ops] confidence monitor unavailable');
      setError('Confidence telemetry is unavailable right now.');
    } else {
      setError(null);
      setData(raw as unknown as ConfidenceMonitorData);
    }
    setIsLoading(false);
  }, [days]);

  useEffect(() => {
    setIsLoading(true);
    void load();
    const timer = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const healthy = data?.healthy_share ?? null;
  const deploys = data?.by_deploy ?? [];
  const sources = data?.by_source ?? [];
  const failing = data?.top_failing ?? [];

  return (
    <div className="space-y-6">
      <ConsoleHeading
        index="02"
        title="Confidence monitor"
        note={`Live translation confidence per deploy. Target: ${TARGET_HEALTHY_SHARE}% of searches at 0.75 confidence or better.`}
        action={
          <div className="flex items-center gap-2">
            <StatusTag tone={shareTone(healthy)}>
              {healthy == null ? 'no data' : healthy >= TARGET_HEALTHY_SHARE ? 'on target' : 'below target'}
            </StatusTag>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Refresh
            </Button>
          </div>
        }
      />

      {isLoading && !data ? (
        <ConsolePanel>
          <EmptyRow>Loading confidence telemetry…</EmptyRow>
        </ConsolePanel>
      ) : error || !data ? (
        <ConsolePanel>
          <EmptyRow>{error ?? 'No confidence telemetry in this window.'}</EmptyRow>
        </ConsolePanel>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Healthy share"
              value={pct(healthy)}
              tone={shareTone(healthy)}
              hint={`Confidence ≥ ${data.low_threshold}`}
            />
            <Metric label="Avg confidence" value={conf(data.avg_confidence)} />
            <Metric
              label="Low-confidence rate"
              value={pct(data.low_confidence_rate)}
              tone={
                data.low_confidence_rate == null
                  ? 'neutral'
                  : data.low_confidence_rate <= 25
                    ? 'good'
                    : data.low_confidence_rate <= 35
                      ? 'warn'
                      : 'bad'
              }
            />
            <Metric
              label="Translations"
              value={data.total_translations}
              hint={`Last ${data.window_days}d · updated ${shortTime(data.generated_at)}`}
            />
          </div>

          <ConsolePanel title="By deploy" note="Most recent builds first">
            {deploys.length === 0 ? (
              <EmptyRow>No builds reported telemetry in this window.</EmptyRow>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full font-mono text-[11px]">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-1.5 pr-3 font-normal">Build</th>
                      <th className="py-1.5 pr-3 text-right font-normal">Searches</th>
                      <th className="py-1.5 pr-3 text-right font-normal">Healthy</th>
                      <th className="py-1.5 pr-3 text-right font-normal">Avg conf</th>
                      <th className="py-1.5 pr-3 text-right font-normal">Zero results</th>
                      <th className="py-1.5 pr-3 text-right font-normal">p95</th>
                      <th className="py-1.5 text-right font-normal">Last seen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {deploys.map((row) => (
                      <tr key={row.app_version}>
                        <th scope="row" className="py-1.5 pr-3 text-left font-normal text-foreground">
                          {row.app_version}
                        </th>
                        <td className="py-1.5 pr-3 text-right text-muted-foreground">{row.count}</td>
                        <td
                          className={`py-1.5 pr-3 text-right ${
                            shareTone(row.healthy_share) === 'good'
                              ? 'text-success'
                              : shareTone(row.healthy_share) === 'bad'
                                ? 'text-destructive'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {pct(row.healthy_share)}
                        </td>
                        <td className="py-1.5 pr-3 text-right text-muted-foreground">{conf(row.avg_confidence)}</td>
                        <td className="py-1.5 pr-3 text-right text-muted-foreground">{pct(row.zero_result_rate)}</td>
                        <td className="py-1.5 pr-3 text-right text-muted-foreground">{ms(row.latency_p95)}</td>
                        <td className="py-1.5 text-right text-muted-foreground">{shortTime(row.last_seen)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ConsolePanel>

          <ConsolePanel title="Low confidence by source" note="Where the pipeline is guessing">
            {sources.length === 0 ? (
              <EmptyRow>No translations in this window.</EmptyRow>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full font-mono text-[11px]">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-1.5 pr-3 font-normal">Source</th>
                      <th className="py-1.5 pr-3 text-right font-normal">Count</th>
                      <th className="py-1.5 pr-3 text-right font-normal">Avg conf</th>
                      <th className="py-1.5 text-right font-normal">Low rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sources.map((row) => (
                      <tr key={row.source}>
                        <th scope="row" className="py-1.5 pr-3 text-left font-normal text-foreground">
                          {row.source}
                        </th>
                        <td className="py-1.5 pr-3 text-right text-muted-foreground">{row.count}</td>
                        <td className="py-1.5 pr-3 text-right text-muted-foreground">{conf(row.avg_confidence)}</td>
                        <td className="py-1.5 text-right text-muted-foreground">{pct(row.low_confidence_rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ConsolePanel>

          <ConsolePanel
            title="Top failing patterns"
            note="Recurring low-confidence queries — the automated repair loop targets these"
          >
            {failing.length === 0 ? (
              <EmptyRow>No recurring low-confidence queries. Nice.</EmptyRow>
            ) : (
              <div className="divide-y divide-border">
                {failing.map((row) => (
                  <Link
                    key={row.query}
                    to={`/admin/search/lab?q=${encodeURIComponent(row.query)}`}
                    className="flex items-baseline justify-between gap-3 py-1.5 hover:bg-muted/20"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs text-foreground">{row.query}</span>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                      {row.count}× · conf {conf(row.avg_confidence)}
                      {row.zero_results > 0 ? ` · ${row.zero_results} empty` : ''}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </ConsolePanel>
        </>
      )}
    </div>
  );
}
