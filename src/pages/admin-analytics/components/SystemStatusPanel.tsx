/**
 * System Status Panel — shows cron job health and data freshness
 * for admin transparency. Calls the get_system_status() RPC.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  AlertTriangle,
  Activity,
} from 'lucide-react';

interface CronJob {
  jobid: number;
  jobname: string;
  schedule: string;
  last_status: string | null;
  last_run_at: string | null;
  last_end_at: string | null;
  last_duration_s: number | null;
  last_message: string | null;
  failures_24h: number;
  runs_24h: number;
}

interface DataFreshnessEntry {
  count: number;
  latest?: string | null;
  active?: number;
  pending?: number;
}

interface SystemStatus {
  cronJobs: CronJob[];
  dataFreshness: Record<string, DataFreshnessEntry>;
  serverTime: string;
}

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return 'never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function cronHumanReadable(schedule: string): string {
  const map: Record<string, string> = {
    '*/15 * * * *': 'Every 15 min',
    '0 0 * * *': 'Daily midnight',
    '0 2 * * *': 'Daily 2 AM',
    '0 3 * * *': 'Daily 3 AM',
    '0 4 * * *': 'Daily 4 AM',
    '0 5 * * 0': 'Weekly Sun 5 AM',
    '0 6 * * *': 'Daily 6 AM',
    '0 7 * * *': 'Daily 7 AM',
    '0 8 * * *': 'Daily 8 AM',
    '30 7 * * *': 'Daily 7:30 AM',
  };
  return map[schedule] ?? schedule;
}

const TABLE_LABELS: Record<string, string> = {
  community_decks: 'Community Decks',
  cards: 'Card Catalog',
  card_cooccurrence: 'Co-occurrence Data',
  translation_logs: 'Translation Logs',
  query_cache: 'Query Cache',
  price_snapshots: 'Price Snapshots',
  translation_rules: 'Translation Rules',
  search_feedback: 'Search Feedback',
};

export function SystemStatusPanel() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_system_status');
      if (rpcError) throw rpcError;
      setStatus(data as unknown as SystemStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load status');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="surface-elevated border border-border p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Activity className="h-4 w-4" />
          System Status
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStatus}
          disabled={loading}
          className="gap-1.5 h-8 text-xs"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          {status ? 'Refresh' : 'Load Status'}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {status && (
        <div className="space-y-6">
          {/* Cron Jobs */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Cron Jobs ({status.cronJobs.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left pb-2 pr-3 font-medium">Job</th>
                    <th className="text-left pb-2 pr-3 font-medium">Schedule</th>
                    <th className="text-left pb-2 pr-3 font-medium">Last Run</th>
                    <th className="text-left pb-2 pr-3 font-medium">Status</th>
                    <th className="text-right pb-2 pr-3 font-medium">Duration</th>
                    <th className="text-right pb-2 font-medium">24h</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {status.cronJobs.map((job) => {
                    const hasFails = job.failures_24h > 0;
                    const isSucceeded = job.last_status === 'succeeded';
                    return (
                      <tr key={job.jobid} className="group">
                        <td className="py-2 pr-3 font-medium text-foreground whitespace-nowrap">
                          {job.jobname}
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                          {cronHumanReadable(job.schedule)}
                        </td>
                        <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                          {timeAgo(job.last_run_at)}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {job.last_status == null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : isSucceeded ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                              <XCircle className="h-3 w-3" />
                              {job.last_status}
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-right text-muted-foreground tabular-nums">
                          {job.last_duration_s != null ? `${job.last_duration_s}s` : '—'}
                        </td>
                        <td className="py-2 text-right whitespace-nowrap">
                          <span className="tabular-nums text-muted-foreground">
                            {job.runs_24h} runs
                          </span>
                          {hasFails && (
                            <span className="ml-1.5 inline-flex items-center gap-0.5 text-red-600 dark:text-red-400">
                              <AlertTriangle className="h-3 w-3" />
                              {job.failures_24h} fail
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Data Freshness */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" />
              Data Freshness
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(status.dataFreshness).map(([key, entry]) => {
                const label = TABLE_LABELS[key] ?? key;
                const latestAgo = entry.latest ? timeAgo(entry.latest) : null;
                return (
                  <div
                    key={key}
                    className="border border-border rounded-lg p-3 space-y-1"
                  >
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
                      {label}
                    </p>
                    <p className="text-lg font-bold text-foreground tabular-nums">
                      {entry.count.toLocaleString()}
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {latestAgo && (
                        <p className="text-[10px] text-muted-foreground">
                          Updated {latestAgo}
                        </p>
                      )}
                      {entry.active != null && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                          {entry.active} active
                        </p>
                      )}
                      {entry.pending != null && entry.pending > 0 && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400">
                          {entry.pending} pending
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground text-right">
            Server time: {new Date(status.serverTime).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
