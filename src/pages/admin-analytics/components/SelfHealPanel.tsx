/**
 * Self-Healing Search Panel — shows the outcome of the automated repair loop
 * (`self-heal-search` edge function): what it repaired, what graduated out of
 * probation, and what it rolled back on its own.
 */

import { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw, ShieldCheck, Undo2, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface SelfHealRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  candidates: number;
  repaired: number;
  verified: number;
  rolled_back: number;
  skipped: number;
  details: unknown;
}

interface RepairDetail {
  phase?: string;
  query?: string;
  pattern?: string;
  status?: string;
  syntax?: string;
  results?: number;
  reason?: string;
}

interface DiagnosticsBucket {
  code: string;
  attempt_count: number;
  final_count: number;
}

interface DiagnosticsItem {
  query: string | null;
  before_query: string | null;
  after_query: string | null;
  reason_code: string | null;
  reason: string | null;
  attempt_count: number;
}

interface Diagnostics {
  totals?: { unrepairable?: number; total_attempts?: number; runs?: number };
  buckets?: DiagnosticsBucket[];
  items?: DiagnosticsItem[];
}

/** Plain-English explanation for each stable reason code from the repair loop. */
const REASON_LABELS: Record<string, string> = {
  no_model_response: 'Model returned nothing',
  unparseable_response: 'Unparseable model output',
  low_confidence: 'Confidence below threshold',
  duplicate_syntax: 'Repeated an earlier failed query',
  invalid_otag: 'Hallucinated oracle tag',
  scryfall_rejected: 'Scryfall rejected the syntax',
  zero_results: 'Zero results',
  below_threshold: 'Too few results',
};

function formatRelative(iso: string | null): string {
  if (!iso) return 'never';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function toDetails(value: unknown): RepairDetail[] {
  return Array.isArray(value) ? (value as RepairDetail[]) : [];
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wrench;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/50 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </div>
      <div className="text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}

export function SelfHealPanel() {
  const [runs, setRuns] = useState<SelfHealRun[]>([]);
  const [probationCount, setProbationCount] = useState(0);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [runsResult, probationResult, diagnosticsResult] = await Promise.all([
        supabase
          .from('self_heal_runs')
          .select('*')
          .order('started_at', { ascending: false })
          .limit(5),
        supabase
          .from('translation_rules')
          .select('id', { count: 'exact', head: true })
          .eq('auto_generated', true)
          .eq('verification_state', 'probation')
          .is('archived_at', null),
        supabase.rpc('get_self_heal_diagnostics' as never, {
          days_back: 7,
          max_items: 25,
        } as never),
      ]);

      if (runsResult.error) throw new Error(runsResult.error.message);
      setRuns((runsResult.data ?? []) as SelfHealRun[]);
      setProbationCount(probationResult.count ?? 0);
      setDiagnostics(
        diagnosticsResult.error
          ? null
          : ((diagnosticsResult.data ?? null) as Diagnostics | null),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repair runs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const latest = runs[0];
  const details = toDetails(latest?.details).slice(0, 8);
  const buckets: DiagnosticsBucket[] = diagnostics?.buckets ?? [];
  const diagnosticItems: DiagnosticsItem[] = (diagnostics?.items ?? []).slice(0, 8);

  return (
    <section className="rounded-xl border border-border bg-card p-4 space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-foreground">
            Self-healing search
          </h2>
          {latest ? (
            <Badge variant={latest.status === 'failed' ? 'destructive' : 'secondary'}>
              {latest.status} · {formatRelative(latest.started_at)}
            </Badge>
          ) : null}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Refresh self-healing runs"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </header>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : loading && !latest ? (
        <p className="text-sm text-muted-foreground">Loading repair history…</p>
      ) : !latest ? (
        <p className="text-sm text-muted-foreground">
          No automated repair runs recorded yet. The job runs every 6 hours.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Stat icon={Activity} label="Failing" value={latest.candidates} />
            <Stat icon={Wrench} label="Repaired" value={latest.repaired} />
            <Stat icon={ShieldCheck} label="Verified" value={latest.verified} />
            <Stat icon={Undo2} label="Rolled back" value={latest.rolled_back} />
            <Stat icon={Activity} label="On probation" value={probationCount} />
          </div>

          {details.length ? (
            <ul className="space-y-1.5">
              {details.map((detail, index) => (
                <li
                  key={`${detail.query ?? detail.pattern ?? 'detail'}-${index}`}
                  className="rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-xs"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={detail.phase === 'rollback' ? 'destructive' : 'outline'}
                    >
                      {detail.phase === 'rollback' ? 'rolled back' : detail.status}
                    </Badge>
                    <span className="font-medium text-foreground">
                      {detail.query ?? detail.pattern}
                    </span>
                  </div>
                  {detail.syntax ? (
                    <code className="mt-1 block break-all text-muted-foreground">
                      {detail.syntax}
                      {typeof detail.results === 'number'
                        ? ` — ${detail.results} cards`
                        : ''}
                    </code>
                  ) : null}
                  {detail.reason ? (
                    <p className="mt-1 text-muted-foreground">{detail.reason}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nothing to repair in the last run.
            </p>
          )}

          {buckets.length || diagnosticItems.length ? (
            <div className="space-y-2 border-t border-border/60 pt-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Why repairs fail (last 7 days ·{' '}
                {diagnostics?.totals?.unrepairable ?? 0} unrepairable)
              </h3>

              {buckets.length ? (
                <ul className="flex flex-wrap gap-1.5">
                  {buckets.map((bucket) => (
                    <li key={bucket.code}>
                      <Badge variant="outline" className="font-normal">
                        {REASON_LABELS[bucket.code] ?? bucket.code} ·{' '}
                        {bucket.attempt_count} attempts / {bucket.final_count} final
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : null}

              {diagnosticItems.length ? (
                <ul className="space-y-1.5">
                  {diagnosticItems.map((item, index) => (
                    <li
                      key={`${item.query ?? 'item'}-${index}`}
                      className="rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-xs"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="destructive">
                          {item.reason_code
                            ? (REASON_LABELS[item.reason_code] ?? item.reason_code)
                            : 'unknown'}
                        </Badge>
                        <span className="font-medium text-foreground">
                          {item.query}
                        </span>
                        <span className="text-muted-foreground">
                          {item.attempt_count} attempts
                        </span>
                      </div>
                      <code className="mt-1 block break-all text-muted-foreground">
                        before: {item.before_query ?? '—'}
                      </code>
                      <code className="block break-all text-muted-foreground">
                        after: {item.after_query ?? '—'}
                      </code>
                      {item.reason ? (
                        <p className="mt-1 text-muted-foreground">{item.reason}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
