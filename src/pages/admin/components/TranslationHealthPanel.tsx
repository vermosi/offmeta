/**
 * Translation health — how queries were resolved before results were shown.
 *
 * Reads `translation_logs` joined to the terminal `search_outcome` event via
 * `request_id`, so deterministic share, fallback usage and empty-result rate
 * are measured per translation source instead of guessed from totals.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/core/logger';
import { ConsolePanel, EmptyRow, Metric } from './console-ui';

interface SourceRow {
  source: string;
  count: number;
  share: number | null;
  fallback_rate: number | null;
  zero_result_rate: number | null;
  measured: number;
  latency_p50: number | null;
  latency_p95: number | null;
}

interface SearchHealth {
  window_days: number;
  total_translations: number;
  deterministic_share: number | null;
  cache_share: number | null;
  fallback_rate: number | null;
  zero_result_rate: number | null;
  measured_result_coverage: number | null;
  latency_p95: number | null;
  by_source: SourceRow[];
}

const SOURCE_LABELS: Record<string, string> = {
  deterministic: 'Deterministic',
  pattern_match: 'Pattern match',
  raw_syntax: 'Raw Scryfall syntax',
  cache: 'Cache',
  ai: 'AI translation',
  concept: 'Concept graph',
  fallback: 'Fallback (AI unavailable)',
  forced_fallback: 'Fallback (forced)',
  ai_failure_fallback: 'Fallback (AI failed)',
  budget_fallback: 'Fallback (budget exceeded)',
  unknown: 'Unclassified',
};

function pct(value: number | null | undefined): string {
  return value == null ? '—' : `${value}%`;
}

function ms(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;
}

export function TranslationHealthPanel({ days }: { days: number }) {
  const [data, setData] = useState<SearchHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    const { data: raw, error } = await supabase.rpc(
      'get_search_health_metrics' as never,
      { days_back: days } as never,
    );
    if (error) {
      logger.warn('[admin-ops] search health metrics unavailable');
      setData(null);
    } else {
      setData(raw as unknown as SearchHealth);
    }
    setIsLoading(false);
  }, [days]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const rows = data?.by_source ?? [];
  const fallbackRate = data?.fallback_rate ?? null;
  const zeroRate = data?.zero_result_rate ?? null;

  return (
    <ConsolePanel
      title="Translation health"
      note={`How queries resolved over the last ${days} days`}
    >
      {isLoading ? (
        <EmptyRow>Loading translation health…</EmptyRow>
      ) : !data || data.total_translations === 0 ? (
        <EmptyRow>No translations logged in this window.</EmptyRow>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Deterministic share"
              value={pct(data.deterministic_share)}
              hint="Resolved without the AI model"
            />
            <Metric label="Cache share" value={pct(data.cache_share)} />
            <Metric
              label="Fallback rate"
              value={pct(fallbackRate)}
              tone={
                fallbackRate == null ? 'neutral' : fallbackRate <= 5 ? 'good' : fallbackRate <= 15 ? 'warn' : 'bad'
              }
              hint="Degraded to simplified search"
            />
            <Metric
              label="Zero-result rate"
              value={pct(zeroRate)}
              tone={zeroRate == null ? 'neutral' : zeroRate <= 5 ? 'good' : zeroRate <= 12 ? 'warn' : 'bad'}
              hint={`Measured on ${pct(data.measured_result_coverage)} of translations`}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full font-mono text-[11px]">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-1.5 pr-3 font-normal">Source</th>
                  <th className="py-1.5 pr-3 text-right font-normal">Count</th>
                  <th className="py-1.5 pr-3 text-right font-normal">Share</th>
                  <th className="py-1.5 pr-3 text-right font-normal">Zero results</th>
                  <th className="py-1.5 pr-3 text-right font-normal">Fallback</th>
                  <th className="py-1.5 pr-3 text-right font-normal">p50</th>
                  <th className="py-1.5 text-right font-normal">p95</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.source}>
                    <th scope="row" className="py-1.5 pr-3 text-left font-normal text-foreground">
                      {SOURCE_LABELS[row.source] ?? row.source}
                    </th>
                    <td className="py-1.5 pr-3 text-right text-muted-foreground">{row.count}</td>
                    <td className="py-1.5 pr-3 text-right text-muted-foreground">{pct(row.share)}</td>
                    <td className="py-1.5 pr-3 text-right text-muted-foreground">
                      {row.measured === 0 ? '—' : pct(row.zero_result_rate)}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-muted-foreground">{pct(row.fallback_rate)}</td>
                    <td className="py-1.5 pr-3 text-right text-muted-foreground">{ms(row.latency_p50)}</td>
                    <td className="py-1.5 text-right text-muted-foreground">{ms(row.latency_p95)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ConsolePanel>
  );
}
