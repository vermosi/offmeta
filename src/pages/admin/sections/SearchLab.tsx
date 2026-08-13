/**
 * Search Lab — the most important admin surface.
 *
 * Pick a real user query and inspect *why* it succeeded or failed: intent,
 * generated syntax, behavioural signals, existing rules and prior outcomes.
 * Verdicts are recorded as analytics events so quality judgements accumulate.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/core/logger';
import { ConsoleHeading, ConsolePanel, EmptyRow, Metric, StatusTag } from '../components/console-ui';
import type { QueryDetail, QueryRepairItem } from '@/pages/admin-analytics/types';

const VERDICTS = ['GOOD', 'NEEDS WORK', 'WRONG INTENT'] as const;
type Verdict = (typeof VERDICTS)[number];

interface Props {
  repairQueue: readonly QueryRepairItem[];
  queryDetail: QueryDetail | null;
  queryDetailLoading: boolean;
  fetchQueryDetail: (query: string) => Promise<void> | void;
  copyGoldenTestFixture: (query: string) => void;
}

export function SearchLab({
  repairQueue,
  queryDetail,
  queryDetailLoading,
  fetchQueryDetail,
  copyGoldenTestFixture,
}: Props) {
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState('');
  const selected = params.get('q');

  useEffect(() => {
    if (selected && queryDetail?.normalized_query !== selected) {
      void fetchQueryDetail(selected);
    }
    // Only react to an explicit selection change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const rows = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const list = needle
      ? repairQueue.filter((r) => r.display_query.toLowerCase().includes(needle))
      : repairQueue;
    return list.slice(0, 60);
  }, [repairQueue, filter]);

  const select = useCallback(
    (query: string) => {
      const next = new URLSearchParams(params);
      next.set('q', query);
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const recordVerdict = useCallback(
    async (verdict: Verdict) => {
      if (!queryDetail) return;
      const { error } = await supabase.from('analytics_events').insert({
        event_type: 'admin_search_verdict',
        event_data: {
          query: queryDetail.normalized_query,
          verdict,
          quality_score: queryDetail.search_quality_score,
        },
      });
      if (error) {
        logger.warn('[search-lab] verdict not recorded');
        toast.error('Verdict not recorded');
        return;
      }
      toast.success(`Verdict recorded: ${verdict}`);
    },
    [queryDetail],
  );

  return (
    <div className="space-y-6">
      <ConsoleHeading
        index="02"
        title="Search Lab"
        note="Open any query to inspect intent, syntax, behaviour and the rules affecting it."
      />

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <ConsolePanel title="Queries" note={`${repairQueue.length} tracked`}>
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter queries"
            className="mb-3 h-8 rounded-none font-mono text-xs"
          />
          <div className="max-h-[560px] divide-y divide-border overflow-auto">
            {rows.length === 0 ? (
              <EmptyRow>No queries recorded yet.</EmptyRow>
            ) : (
              rows.map((row) => (
                <button
                  key={row.normalized_query}
                  onClick={() => select(row.normalized_query)}
                  className={`flex w-full items-center justify-between gap-2 py-2 text-left transition-colors hover:bg-muted/20 ${
                    selected === row.normalized_query ? 'bg-muted/30' : ''
                  }`}
                >
                  <span className="min-w-0 truncate text-xs text-foreground">
                    {row.display_query}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                    {Math.round(row.search_quality_score * 100)}%
                  </span>
                </button>
              ))
            )}
          </div>
        </ConsolePanel>

        <div className="space-y-4">
          {queryDetailLoading ? (
            <ConsolePanel>
              <div className="flex justify-center py-10">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </ConsolePanel>
          ) : !queryDetail ? (
            <ConsolePanel>
              <EmptyRow>Select a query to open its diagnostic.</EmptyRow>
            </ConsolePanel>
          ) : (
            <>
              <ConsolePanel
                title={queryDetail.display_query}
                note="Original query as searched by users"
                action={
                  <a
                    href={`/?q=${encodeURIComponent(queryDetail.display_query)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
                  >
                    Run <ExternalLink className="h-3 w-3" />
                  </a>
                }
              >
                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  <Metric
                    label="Quality"
                    value={`${Math.round(queryDetail.search_quality_score * 100)}%`}
                    tone={queryDetail.search_quality_score >= 0.7 ? 'good' : 'warn'}
                  />
                  <Metric label="Searches" value={queryDetail.total_searches} />
                  <Metric label="Card clicks" value={queryDetail.result_clicks} />
                  <Metric label="Refinements" value={queryDetail.refinements} />
                  <Metric
                    label="Zero results"
                    value={queryDetail.no_results}
                    tone={queryDetail.no_results > 0 ? 'bad' : 'good'}
                  />
                  <Metric label="Recoveries" value={queryDetail.recoveries} />
                  <Metric label="Reports" value={queryDetail.feedback_reports} />
                  <Metric
                    label="Model confidence"
                    value={`${Math.round(queryDetail.confidence * 100)}%`}
                    hint="Diagnostic only"
                  />
                </div>
              </ConsolePanel>

              <ConsolePanel title="Verdict" note="Human judgement, recorded against this query">
                <div className="flex flex-wrap gap-2">
                  {VERDICTS.map((verdict) => (
                    <Button
                      key={verdict}
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-none font-mono text-[10px] uppercase tracking-[0.18em]"
                      onClick={() => void recordVerdict(verdict)}
                    >
                      {verdict}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-none font-mono text-[10px] uppercase tracking-[0.18em]"
                    onClick={() => copyGoldenTestFixture(queryDetail.normalized_query)}
                  >
                    Test fix
                  </Button>
                </div>
              </ConsolePanel>

              <ConsolePanel title="Rules affecting this query">
                {queryDetail.rules.length === 0 ? (
                  <EmptyRow>No deterministic rule matches — the AI path handles this query.</EmptyRow>
                ) : (
                  <div className="divide-y divide-border">
                    {queryDetail.rules.map((rule) => (
                      <div key={rule.id} className="py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-foreground">{rule.pattern}</span>
                          <StatusTag tone={rule.is_active ? 'good' : 'neutral'}>
                            {rule.is_active ? 'active' : 'inactive'}
                          </StatusTag>
                        </div>
                        <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                          {rule.scryfall_syntax}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ConsolePanel>

              <ConsolePanel title="Recent outcomes" note="Behavioural signals, newest first">
                {queryDetail.recentOutcomes.length === 0 ? (
                  <EmptyRow>No outcomes recorded.</EmptyRow>
                ) : (
                  <div className="max-h-64 divide-y divide-border overflow-auto">
                    {queryDetail.recentOutcomes.map((event) => (
                      <div
                        key={`${event.event_type}-${event.created_at}`}
                        className="flex items-center justify-between gap-3 py-1.5 font-mono text-[11px]"
                      >
                        <span className="text-foreground">{event.event_type}</span>
                        <span className="text-muted-foreground">
                          {new Date(event.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ConsolePanel>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
