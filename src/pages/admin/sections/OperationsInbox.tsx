/**
 * Operations Inbox — the default admin view.
 *
 * A prioritised work queue, not a wall of metrics. Each row answers
 * "what should I improve in OffMeta today" and links straight to the tool
 * where the fix happens.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import { ConsoleHeading, ConsolePanel, EmptyRow, Metric } from '../components/console-ui';
import {
  buildOperationsInbox,
  KIND_LABEL,
  type IntentOpportunity,
} from '../lib/opportunity';
import type { QueryRepairItem } from '@/pages/admin-analytics/types';
import type { OpsFreshness, ProductMetrics } from '@/hooks/useAdminOpsData';

interface Props {
  repairQueue: readonly QueryRepairItem[];
  opportunities: readonly IntentOpportunity[];
  freshness: OpsFreshness;
  metrics: ProductMetrics | null;
  clsRegressionRoute?: string | null;
  isLoading: boolean;
}

export function OperationsInbox({
  repairQueue,
  opportunities,
  freshness,
  metrics,
  clsRegressionRoute,
  isLoading,
}: Props) {
  const items = useMemo(
    () =>
      buildOperationsInbox({
        repairQueue,
        opportunities,
        criticalErrors: freshness.criticalErrors,
        staleJobs: freshness.stale,
        clsRegressionRoute,
      }).slice(0, 25),
    [repairQueue, opportunities, freshness, clsRegressionRoute],
  );

  const successRate = metrics?.search_success_rate;

  return (
    <div className="space-y-6">
      <ConsoleHeading
        index="01"
        title={`Needs attention / ${items.length}`}
        note="Ranked by demand, failure rate and coverage gaps. Work top-down."
      />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Successful search rate"
          value={successRate == null ? '—' : `${successRate}%`}
          hint={metrics ? `${metrics.searches} searches / ${metrics.window_days}d` : undefined}
          tone={successRate == null ? 'neutral' : successRate >= 70 ? 'good' : successRate >= 50 ? 'warn' : 'bad'}
        />
        <Metric
          label="Zero results"
          value={metrics?.zero_result_searches ?? '—'}
          tone={(metrics?.zero_result_searches ?? 0) > 0 ? 'warn' : 'good'}
        />
        <Metric
          label="Card interaction"
          value={metrics?.search_to_card_click_rate == null ? '—' : `${metrics.search_to_card_click_rate}%`}
        />
        <Metric
          label="Returning searchers"
          value={metrics?.returning_searcher_rate == null ? '—' : `${metrics.returning_searcher_rate}%`}
          hint={metrics ? `${metrics.returning_searchers}/${metrics.total_searchers}` : undefined}
        />
      </div>

      <ConsolePanel>
        {isLoading && items.length === 0 ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <EmptyRow>Nothing needs attention in this window.</EmptyRow>
        ) : (
          <ol className="divide-y divide-border">
            {items.map((item, index) => (
              <li key={item.id}>
                <Link
                  to={item.href}
                  className="group flex items-center gap-4 py-2.5 transition-colors hover:bg-muted/20"
                >
                  <span className="w-6 shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="w-[132px] shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {KIND_LABEL[item.kind]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-foreground">{item.title}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {item.detail}
                    </span>
                  </span>
                  <span className="hidden w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground sm:block">
                    {item.score}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground group-hover:text-primary">
                    {item.action}
                    <ArrowUpRight className="h-3 w-3" />
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </ConsolePanel>
    </div>
  );
}
