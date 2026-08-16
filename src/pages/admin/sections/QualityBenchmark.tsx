/**
 * Quality Benchmark — successful search rate derived from user behaviour,
 * not model confidence. Model confidence stays as an internal diagnostic.
 */

import { ConsoleHeading, ConsolePanel, Metric } from '../components/console-ui';
import { SearchOutcomePanel } from '../components/SearchOutcomePanel';
import { TranslationHealthPanel } from '../components/TranslationHealthPanel';
import { RELEASES } from '@/lib/admin/releases';
import type { ProductMetrics } from '@/hooks/useAdminOpsData';
import type { AnalyticsData } from '@/pages/admin-analytics/types';

interface Props {
  metrics: ProductMetrics | null;
  analytics: AnalyticsData | null;
  days: number;
}

export function QualityBenchmark({ metrics, analytics, days }: Props) {
  const rate = metrics?.search_success_rate ?? null;

  return (
    <div className="space-y-6">
      <ConsoleHeading
        index="02"
        title="Quality benchmark"
        note={`Behavioural success over the last ${days} days. Model confidence is diagnostic only.`}
      />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Successful search rate"
          value={rate == null ? '—' : `${rate}%`}
          tone={rate == null ? 'neutral' : rate >= 70 ? 'good' : rate >= 50 ? 'warn' : 'bad'}
        />
        <Metric
          label="Search → card click"
          value={metrics?.search_to_card_click_rate == null ? '—' : `${metrics.search_to_card_click_rate}%`}
        />
        <Metric
          label="Search → refinement"
          value={metrics?.search_to_refinement_rate == null ? '—' : `${metrics.search_to_refinement_rate}%`}
        />
        <Metric
          label="Search → external action"
          value={
            metrics?.search_to_external_action_rate == null
              ? '—'
              : `${metrics.search_to_external_action_rate}%`
          }
        />
        <Metric label="Zero-result searches" value={metrics?.zero_result_searches ?? '—'} tone="warn" />
        <Metric label="Searches / session" value={metrics?.searches_per_session ?? '—'} />
        <Metric label="D7 retention" value={metrics?.retention_d7 == null ? '—' : `${metrics.retention_d7}%`} />
        <Metric
          label="Model confidence"
          value={analytics ? `${Math.round(analytics.summary.avgConfidence * 100)}%` : '—'}
          hint="Internal diagnostic"
        />
      </div>

      <SearchOutcomePanel days={days} />

      <TranslationHealthPanel days={days} />

      <ConsolePanel title="Release markers" note="Compare movements against what shipped">
        <div className="divide-y divide-border font-mono text-[11px]">
          {RELEASES.map((release) => (
            <div key={release.version} className="flex gap-3 py-1.5">
              <span className="w-24 shrink-0 text-muted-foreground">{release.date}</span>
              <span className="text-foreground">{release.changes[0]}</span>
            </div>
          ))}
        </div>
      </ConsolePanel>
    </div>
  );
}
