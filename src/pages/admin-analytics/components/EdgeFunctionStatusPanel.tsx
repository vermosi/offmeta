/**
 * Panel showing each scheduled edge function's last run:
 * - Timestamp of last cron execution
 * - Cron run status (succeeded/failed)
 * - Last HTTP status code from the invoked function (via pg_net)
 * - Error / return message summary
 *
 * Data source: `public.get_edge_function_status()` RPC (admin only).
 */

import { useEffect, useState, useCallback } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface EdgeFnStatusRow {
  jobid: number;
  jobname: string;
  function_name: string | null;
  schedule: string;
  active: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
  last_return_message: string | null;
  last_http_status_code: number | null;
  last_http_error: string | null;
  last_http_at: string | null;
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  if (diff < 0) return 'in future';
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function truncate(s: string | null, n = 140): string {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function httpBadge(row: EdgeFnStatusRow) {
  if (row.last_http_status_code != null) {
    const ok = row.last_http_status_code >= 200 && row.last_http_status_code < 300;
    return (
      <Badge variant={ok ? 'secondary' : 'destructive'} className="text-[10px]">
        HTTP {row.last_http_status_code}
      </Badge>
    );
  }
  if (row.last_http_error) {
    return (
      <Badge variant="destructive" className="text-[10px]">
        net error
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] text-muted-foreground">
      no data
    </Badge>
  );
}

function runBadge(row: EdgeFnStatusRow) {
  const s = row.last_run_status;
  if (!s) {
    return (
      <Badge variant="outline" className="text-[10px] text-muted-foreground">
        never ran
      </Badge>
    );
  }
  const ok = s === 'succeeded';
  return (
    <Badge variant={ok ? 'secondary' : 'destructive'} className="text-[10px] gap-1">
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {s}
    </Badge>
  );
}

export function EdgeFunctionStatusPanel() {
  const [rows, setRows] = useState<EdgeFnStatusRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [hideOk, setHideOk] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Typed as any because the generated types file may not yet include this RPC.
      const { data, error: rpcError } = await (supabase.rpc as unknown as (
        fn: string,
      ) => Promise<{ data: EdgeFnStatusRow[] | null; error: { message: string } | null }>)(
        'get_edge_function_status',
      );
      if (rpcError) throw rpcError;
      setRows(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!collapsed) void load();
  }, [collapsed, load]);

  const filtered = hideOk
    ? rows.filter((r) => {
        const runFail = r.last_run_status && r.last_run_status !== 'succeeded';
        const httpFail =
          r.last_http_status_code != null &&
          (r.last_http_status_code < 200 || r.last_http_status_code >= 300);
        const netErr = !!r.last_http_error;
        const stale =
          r.last_run_at &&
          Date.now() - new Date(r.last_run_at).getTime() > 1000 * 60 * 60 * 48;
        return runFail || httpFail || netErr || stale || !r.last_run_at;
      })
    : rows;

  const failing = rows.filter(
    (r) =>
      (r.last_run_status && r.last_run_status !== 'succeeded') ||
      (r.last_http_status_code != null &&
        (r.last_http_status_code < 200 || r.last_http_status_code >= 300)) ||
      !!r.last_http_error,
  ).length;

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-2 text-left flex-1 min-w-0"
        >
          <Activity className="h-4 w-4" />
          <h2 className="text-base font-semibold text-foreground">
            Scheduled Job Status
          </h2>
          <Badge variant="secondary" className="text-xs font-normal">
            {rows.length}
          </Badge>
          {failing > 0 && (
            <Badge variant="destructive" className="text-xs font-normal gap-1">
              <AlertTriangle className="h-3 w-3" />
              {failing} failing
            </Badge>
          )}
          {collapsed ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" />
          )}
        </button>
        {!collapsed && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHideOk((h) => !h)}
              className="h-7 px-2 text-xs"
            >
              {hideOk ? 'Show all' : 'Only issues'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load()}
              disabled={loading}
              className="h-7 px-2 gap-1"
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Refresh
            </Button>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="mt-4">
          {error && (
            <div className="text-xs text-destructive mb-3">{error}</div>
          )}
          {!error && !loading && filtered.length === 0 && (
            <div className="text-xs text-muted-foreground">
              {rows.length === 0 ? 'No scheduled jobs found.' : 'No issues detected.'}
            </div>
          )}
          <div className="space-y-2">
            {filtered.map((row) => {
              const isExpanded = expandedRow === row.jobid;
              return (
                <div
                  key={row.jobid}
                  className="rounded-lg border border-border bg-background p-3"
                >
                  <button
                    onClick={() =>
                      setExpandedRow((prev) => (prev === row.jobid ? null : row.jobid))
                    }
                    className="w-full flex items-start justify-between gap-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground truncate">
                          {row.jobname}
                        </span>
                        {row.function_name && (
                          <Badge variant="outline" className="text-[10px]">
                            {row.function_name}
                          </Badge>
                        )}
                        {!row.active && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            inactive
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span title={row.last_run_at ?? ''}>
                          {formatRelative(row.last_run_at)}
                        </span>
                        <span className="opacity-60">·</span>
                        <code className="text-[10px] bg-muted/50 px-1 py-0.5 rounded">
                          {row.schedule}
                        </code>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {runBadge(row)}
                      {httpBadge(row)}
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                      <div>
                        <div className="font-medium text-muted-foreground mb-1">
                          Cron return message
                        </div>
                        <pre className="bg-muted/50 rounded p-2 overflow-auto max-h-32 text-foreground whitespace-pre-wrap">
                          {truncate(row.last_return_message, 500) || '—'}
                        </pre>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground mb-1">
                          HTTP response{' '}
                          {row.last_http_at && (
                            <span className="font-normal">
                              ({formatRelative(row.last_http_at)})
                            </span>
                          )}
                        </div>
                        <pre className="bg-muted/50 rounded p-2 overflow-auto max-h-32 text-foreground whitespace-pre-wrap">
                          {row.last_http_error
                            ? `error: ${truncate(row.last_http_error, 500)}`
                            : row.last_http_status_code != null
                              ? `status: ${row.last_http_status_code}`
                              : '—'}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
