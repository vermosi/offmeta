/**
 * Search outcome breakdown — where started searches actually end up.
 *
 * Pairs `search_started` counts with the terminal `search_outcome` event so the
 * gap between "user submitted a query" and "user saw results" is a named
 * number (timeout, error, zero results, abandoned) rather than an inference.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/core/logger';
import { ConsolePanel, Metric } from './console-ui';

interface OutcomeRow {
  outcome: string;
  total: number;
  degraded: number;
  p75_elapsed_ms: number | null;
}

interface OutcomeBreakdown {
  since: string;
  searches_started: number;
  outcomes: OutcomeRow[];
  time_to_results_p50_ms: number | null;
  time_to_results_p75_ms: number | null;
}

const OUTCOME_LABELS: Record<string, string> = {
  results: 'Results shown',
  zero_results: 'Zero results',
  translate_timeout: 'Translation timeout',
  translate_error: 'Translation error',
  scryfall_error: 'Card fetch error',
  rate_limited: 'Rate limited',
  superseded: 'Replaced by new search',
  navigated_away: 'Left before results',
  unknown: 'Unclassified',
};

function formatMs(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;
}

export function SearchOutcomePanel({ days }: { days: number }) {
  const [data, setData] = useState<OutcomeBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    const { data: raw, error } = await supabase.rpc(
      'get_search_outcome_breakdown' as never,
      { days_back: days } as never,
    );
    if (error) {
      logger.warn('[admin-ops] search outcome breakdown unavailable');
      setData(null);
    } else {
      setData(raw as unknown as OutcomeBreakdown);
    }
    setIsLoading(false);
  }, [days]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const outcomes = data?.outcomes ?? [];
  const reported = outcomes.reduce((sum, row) => sum + row.total, 0);
  const started = data?.searches_started ?? 0;
  const resultsCount = outcomes.find((row) => row.outcome === 'results')?.total ?? 0;
  const reachedResultsRate =
    started > 0 ? Math.round((resultsCount / started) * 100) : null;

  return (
    <ConsolePanel
      title="Search outcomes"
      note={`Terminal outcome per started search, last ${days} days`}
    >
      <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Searches started" value={started || '—'} />
        <Metric
          label="Reached results"
          value={reachedResultsRate == null ? '—' : `${reachedResultsRate}%`}
          tone={
            reachedResultsRate == null
              ? 'neutral'
              : reachedResultsRate >= 80
                ? 'good'
                : reachedResultsRate >= 60
                  ? 'warn'
                  : 'bad'
          }
        />
        <Metric label="Time to results p50" value={formatMs(data?.time_to_results_p50_ms ?? null)} />
        <Metric label="Time to results p75" value={formatMs(data?.time_to_results_p75_ms ?? null)} />
      </div>

      <div className="border-t border-border font-mono text-[11px]">
        {isLoading && <p className="px-4 py-3 text-muted-foreground">Loading…</p>}
        {!isLoading && outcomes.length === 0 && (
          <p className="px-4 py-3 text-muted-foreground">
            No outcome events recorded yet in this window.
          </p>
        )}
        {!isLoading &&
          outcomes.map((row) => {
            const share = reported > 0 ? Math.round((row.total / reported) * 100) : 0;
            return (
              <div
                key={row.outcome}
                className="flex items-center gap-3 border-b border-border px-4 py-1.5 last:border-b-0"
              >
                <span className="w-52 shrink-0 truncate text-foreground">
                  {OUTCOME_LABELS[row.outcome] ?? row.outcome}
                </span>
                <span className="w-14 text-right text-muted-foreground">{row.total}</span>
                <span className="w-12 text-right text-muted-foreground">{share}%</span>
                <span className="w-20 text-right text-muted-foreground">
                  {formatMs(row.p75_elapsed_ms)}
                </span>
                <span className="flex-1 text-right text-muted-foreground">
                  {row.degraded > 0 ? `${row.degraded} degraded` : ''}
                </span>
              </div>
            );
          })}
      </div>
    </ConsolePanel>
  );
}
