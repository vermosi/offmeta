/**
 * SEO Health Panel — surfaces prerender/sitemap/noindex regressions detected by
 * the seo-health-check edge function. Data comes from the get_seo_health_summary()
 * RPC (admin-guarded). Shows the latest run's per-URL verdicts and any failures
 * in the last 7 days so traffic-killing regressions are caught within days.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

type Severity = 'info' | 'warning' | 'critical';

interface LatestResult {
  target_url: string;
  check_type: string;
  passed: boolean;
  severity: Severity;
  details: Record<string, unknown>;
}

interface RecentFailure {
  check_type: string;
  target_url: string;
  severity: Severity;
  failures: number;
  last_failure_at: string;
}

interface SeoHealthSummary {
  last_run: string | null;
  latest_results: LatestResult[];
  recent_failures: RecentFailure[];
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function severityBadge(sev: Severity) {
  if (sev === 'critical')
    return (
      <Badge variant="destructive" className="uppercase tracking-wide">
        Critical
      </Badge>
    );
  if (sev === 'warning')
    return (
      <Badge className="bg-warning/20 text-warning border-warning/40 uppercase tracking-wide">
        Warning
      </Badge>
    );
  return (
    <Badge variant="secondary" className="uppercase tracking-wide">
      OK
    </Badge>
  );
}

export function SeoHealthPanel() {
  const [summary, setSummary] = useState<SeoHealthSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('get_seo_health_summary');
    if (rpcError) {
      setError(rpcError.message);
    } else if (data) {
      setSummary(data as unknown as SeoHealthSummary);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const criticalCount =
    summary?.latest_results.filter((r) => r.severity === 'critical').length ?? 0;
  const warningCount =
    summary?.latest_results.filter((r) => r.severity === 'warning').length ?? 0;

  return (
    <div className="surface-elevated p-5 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          SEO Health Monitor
          {summary?.last_run && (
            <span className="text-xs text-muted-foreground font-normal flex items-center gap-1">
              <Clock className="h-3 w-3" /> {formatRelative(summary.last_run)}
            </span>
          )}
        </h2>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error && (
        <div className="text-sm text-destructive mb-3">Failed to load: {error}</div>
      )}

      {!summary?.last_run && !loading && (
        <p className="text-sm text-muted-foreground">
          No health checks have run yet. The daily check runs at 09:00 UTC — or
          trigger the <code>seo-health-check</code> function manually to seed data.
        </p>
      )}

      {summary?.last_run && (
        <>
          <div className="flex items-center gap-3 mb-4 text-sm">
            {criticalCount > 0 ? (
              <span className="flex items-center gap-1.5 text-destructive font-medium">
                <AlertTriangle className="h-4 w-4" /> {criticalCount} critical
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-success font-medium">
                <CheckCircle2 className="h-4 w-4" /> All checks passing
              </span>
            )}
            {warningCount > 0 && (
              <span className="text-warning">{warningCount} warning</span>
            )}
            <span className="text-muted-foreground">
              · {summary.latest_results.length} URLs checked
            </span>
          </div>

          <div className="space-y-1 max-h-72 overflow-auto text-sm">
            {summary.latest_results.map((r) => (
              <div
                key={r.target_url}
                className="flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <a
                      href={r.target_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate hover:underline text-foreground/90"
                    >
                      {new URL(r.target_url).pathname}
                    </a>
                    <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                  </div>
                  {!r.passed &&
                    Array.isArray((r.details as { failures?: string[] }).failures) && (
                      <div className="text-xs text-destructive mt-0.5">
                        {(r.details as { failures: string[] }).failures.join(', ')}
                      </div>
                    )}
                </div>
                {severityBadge(r.severity)}
              </div>
            ))}
          </div>

          {summary.recent_failures.length > 0 && (
            <details className="mt-4 text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Recent failures (7d) — {summary.recent_failures.length}
              </summary>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {summary.recent_failures.slice(0, 20).map((f, i) => (
                  <li key={`${f.target_url}-${i}`}>
                    <span className="text-destructive">{f.severity}</span>{' '}
                    <span className="text-foreground/80">{f.check_type}</span>{' '}
                    {new URL(f.target_url).pathname} — {f.failures}× ·{' '}
                    {formatRelative(f.last_failure_at)}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}
