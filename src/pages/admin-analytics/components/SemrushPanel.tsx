/**
 * Semrush Panel — organic visibility, striking-distance keywords, and backlink
 * authority for offmeta.app, pulled through the admin-only `semrush-seo` edge
 * function. Data is cached server-side for 24h to protect the free-plan quota.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  ExternalLink,
  Link2,
  RefreshCw,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface SemrushReport {
  columns: string[];
  rows: Record<string, string>[];
  error?: string;
}

interface SemrushResponse {
  domain: string;
  database: string;
  overview: SemrushReport;
  keywords: SemrushReport;
  history: SemrushReport;
  backlinks: SemrushReport;
  limits: SemrushReport;
  cached: boolean;
  fetchedAt: string;
  error?: string;
}

function firstRow(report?: SemrushReport): Record<string, string> {
  return report?.rows?.[0] ?? {};
}

function formatNumber(value: string | undefined): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '—';
  return parsed.toLocaleString();
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'never';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/50 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function SemrushPanel() {
  const [data, setData] = useState<SemrushResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const { data: response, error: fnError } =
        await supabase.functions.invoke<SemrushResponse>('semrush-seo', {
          body: { refresh },
        });
      if (fnError) throw fnError;
      if (!response) throw new Error('Empty response');
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Semrush data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const overview = firstRow(data?.overview);
  const backlinks = firstRow(data?.backlinks);

  /** Keywords ranking 11–30: closest realistic wins for page-1 movement. */
  const strikingDistance = useMemo(() => {
    const rows = data?.keywords?.rows ?? [];
    return rows
      .filter((row) => {
        const position = Number(row.Po);
        return Number.isFinite(position) && position >= 11 && position <= 30;
      })
      .sort((a, b) => Number(b.Nq) - Number(a.Nq))
      .slice(0, 15);
  }, [data]);

  const reportError =
    data?.overview?.error ??
    data?.keywords?.error ??
    data?.backlinks?.error ??
    null;

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent" />
          Semrush SEO
        </h2>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            {data?.cached ? 'cached' : 'live'} · {formatRelative(data?.fetchedAt ?? null)}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void load(true)}
            disabled={loading}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </header>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {reportError && (
        <p className="text-sm text-warning">{reportError}</p>
      )}

      {loading && !data ? (
        <div className="h-24 animate-pulse rounded-lg bg-muted/40" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Organic keywords" value={formatNumber(overview.Or)} />
            <Stat label="Est. traffic / mo" value={formatNumber(overview.Ot)} />
            <Stat
              label="Authority score"
              value={backlinks.ascore ? `${backlinks.ascore}/100` : '—'}
            />
            <Stat
              label="Referring domains"
              value={formatNumber(backlinks.domains_num)}
            />
          </div>

          <div>
            <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
              <Target className="h-3.5 w-3.5 text-accent" />
              Striking distance (positions 11–30)
            </h3>
            {strikingDistance.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No keywords in striking distance yet — most rankings are still
                below position 30.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="py-1 pr-2">Keyword</th>
                      <th className="py-1 pr-2">Pos</th>
                      <th className="py-1 pr-2">Volume</th>
                      <th className="py-1 pr-2">KD</th>
                      <th className="py-1">Page</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strikingDistance.map((row) => (
                      <tr
                        key={`${row.Ph}-${row.Ur}`}
                        className="border-t border-border/60"
                      >
                        <td className="py-1.5 pr-2 truncate max-w-[220px]">
                          {row.Ph}
                        </td>
                        <td className="py-1.5 pr-2 tabular-nums">{row.Po}</td>
                        <td className="py-1.5 pr-2 tabular-nums">
                          {formatNumber(row.Nq)}
                        </td>
                        <td className="py-1.5 pr-2 tabular-nums">
                          {row.Kd || '—'}
                        </td>
                        <td className="py-1.5">
                          {row.Ur ? (
                            <a
                              href={row.Ur}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-accent hover:underline"
                            >
                              open
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-3">
              <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
                <Link2 className="h-3.5 w-3.5 text-accent" />
                Backlinks
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Total links: {formatNumber(backlinks.total)}</li>
                <li>Referring IPs: {formatNumber(backlinks.ips_num)}</li>
                <li>Follow: {formatNumber(backlinks.follows_num)}</li>
                <li>Nofollow: {formatNumber(backlinks.nofollows_num)}</li>
              </ul>
            </div>
            <div className="rounded-lg border border-border p-3">
              <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
                <TrendingUp className="h-3.5 w-3.5 text-accent" />
                Trend (last months)
              </h3>
              {data?.history?.rows?.length ? (
                <ul className="text-sm text-muted-foreground space-y-1">
                  {data.history.rows.slice(0, 4).map((row) => (
                    <li key={row.Dt}>
                      {row.Dt}: {formatNumber(row.Or)} keywords ·{' '}
                      {formatNumber(row.Ot)} traffic
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  History needs a paid Semrush plan.
                </p>
              )}
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Source: Semrush (free plan). Cached 24h per domain to stay within
            daily API units.
          </p>
        </>
      )}
    </section>
  );
}
