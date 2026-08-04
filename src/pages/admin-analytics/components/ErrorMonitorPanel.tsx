/**
 * Error Monitor Panel — surfaces failures captured in public.error_events and
 * the outcome of the automated repair job (error-auto-fix edge function).
 *
 * Data comes from the admin-guarded get_error_monitor_summary() RPC.
 */

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

type Severity = 'info' | 'warning' | 'error' | 'critical';

interface ErrorRow {
  id: string;
  source: string;
  error_type: string;
  message: string;
  url: string | null;
  severity: Severity;
  occurrence_count: number;
  status: string;
  fix_attempts: number;
  last_fix_result: { outcomes?: Array<{ action: string; ok: boolean; detail?: string }> } | null;
  last_seen_at: string;
}

interface Summary {
  since: string;
  by_status: Record<string, number>;
  top_open: ErrorRow[];
  auto_repaired: number;
}

const severityClasses: Record<Severity, string> = {
  info: 'bg-muted text-muted-foreground',
  warning: 'bg-amber-500/15 text-amber-500',
  error: 'bg-destructive/15 text-destructive',
  critical: 'bg-destructive/25 text-destructive',
};

export function ErrorMonitorPanel() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fixResult, setFixResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc(
        'get_error_monitor_summary',
        { days_back: 7 },
      );
      if (rpcError) throw new Error(rpcError.message);
      setSummary(data as unknown as Summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load errors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runAutoFix = useCallback(async () => {
    setFixing(true);
    setFixResult(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'error-auto-fix',
        { body: { reason: 'manual' } },
      );
      if (fnError) throw new Error(fnError.message);
      const examined = (data as { examined?: number })?.examined ?? 0;
      const repaired = (data as { repaired?: number })?.repaired ?? 0;
      setFixResult(`Examined ${examined} · repaired ${repaired}`);
      await load();
    } catch (err) {
      setFixResult(err instanceof Error ? err.message : 'Auto-fix failed');
    } finally {
      setFixing(false);
    }
  }, [load]);

  const openCount =
    (summary?.by_status.open ?? 0) + (summary?.by_status.failed ?? 0);

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
            Error monitor
          </h2>
          <p className="text-sm text-muted-foreground">
            Page and pipeline failures from the last 7 days, with automated repair status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={runAutoFix}
            disabled={fixing}
          >
            <Wrench className={`h-4 w-4 mr-2 ${fixing ? 'animate-pulse' : ''}`} />
            Run auto-fix
          </Button>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh errors</span>
          </Button>
        </div>
      </header>

      {error && (
        <p className="text-sm text-destructive mb-3" role="alert">
          {error}
        </p>
      )}
      {fixResult && (
        <p className="text-sm text-muted-foreground mb-3">{fixResult}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Open / failed</p>
          <p className="text-2xl font-semibold">{openCount}</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Auto-repaired</p>
          <p className="text-2xl font-semibold">{summary?.auto_repaired ?? 0}</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs text-muted-foreground">Repairing</p>
          <p className="text-2xl font-semibold">
            {summary?.by_status.repairing ?? 0}
          </p>
        </div>
      </div>

      {loading && !summary ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (summary?.top_open?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          No open errors in the last 7 days.
        </p>
      ) : (
        <ul className="space-y-2">
          {summary?.top_open.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-border p-3 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Badge className={severityClasses[row.severity] ?? ''}>
                  {row.severity}
                </Badge>
                <span className="font-medium">{row.error_type}</span>
                <span className="text-muted-foreground">· {row.source}</span>
                <span className="text-muted-foreground">
                  · {row.occurrence_count}×
                </span>
                <span className="text-muted-foreground">
                  · {row.status}
                  {row.fix_attempts > 0 ? ` (${row.fix_attempts} fix attempts)` : ''}
                </span>
              </div>
              <p className="text-muted-foreground break-words">{row.message}</p>
              {row.url && (
                <p className="text-xs text-muted-foreground mt-1 break-all">
                  {row.url}
                </p>
              )}
              {row.last_fix_result?.outcomes?.length ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Last fix:{' '}
                  {row.last_fix_result.outcomes
                    .map((o) => `${o.action}=${o.ok ? 'ok' : 'fail'}`)
                    .join(', ')}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
