import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Lightbulb,
  Search,
  Sparkles,
  TrendingDown,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { AnalyticsData } from '@/pages/admin-analytics/types';

interface ActionableInsightsPanelProps {
  data: AnalyticsData;
}

function clampPercent(value: number): string {
  return `${Math.round(Math.max(0, Math.min(value, 100)))}%`;
}

export function ActionableInsightsPanel({
  data,
}: ActionableInsightsPanelProps) {
  const topZeroResultQuery = data.lowConfidenceQueries[0];
  const lowConfidenceRate = data.confidenceBuckets.low;
  const fallbackRate = data.summary.fallbackRate;
  const highConfidenceRate = data.confidenceBuckets.high;

  const insights = [
    {
      icon: TrendingDown,
      title: 'Reduce fallback searches',
      detail:
        fallbackRate >= 20
          ? `Fallbacks are at ${clampPercent(fallbackRate)}. Review the repair queue and recent failures first.`
          : `Fallbacks are at ${clampPercent(fallbackRate)}. Keep an eye on the long tail of hard queries${
              topZeroResultQuery
                ? `, starting with "${topZeroResultQuery.query}"`
                : ''
            }.`,
      href: '/admin/curated-searches',
      cta: 'Review curated searches',
    },
    {
      icon: Sparkles,
      title: 'Triage low-confidence translations',
      detail:
        lowConfidenceRate > 0
          ? `${lowConfidenceRate.toLocaleString()} low-confidence queries were observed. Add or refine rules for the most common patterns.`
          : 'No low-confidence queries appeared in this window. The deterministic coverage looks healthy.',
      href: '/admin/curated-searches',
      cta: 'Improve translation rules',
    },
    {
      icon: Search,
      title: 'Protect high-intent searches',
      detail:
        highConfidenceRate < 70
          ? `Only ${clampPercent(highConfidenceRate)} of searches are high confidence. Strengthen the top queries and landing paths.`
          : `High-confidence coverage is ${clampPercent(highConfidenceRate)}. Focus on conversion and retention next.`,
      href: '/search/treasure',
      cta: 'Inspect search flow',
    },
  ];

  return (
    <section className="surface-elevated border border-border p-5">
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            Actionable insights
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Quick wins derived from the current analytics window.
          </p>
        </div>
        <Badge
          variant="secondary"
          className="text-[10px] uppercase tracking-wide"
        >
          {data.summary.days} day window
        </Badge>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {insights.map((insight) => {
          const Icon = insight.icon;
          return (
            <div
              key={insight.title}
              className="rounded-2xl border border-border/70 bg-background/70 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-foreground">
                  {insight.title}
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {insight.detail}
              </p>
              <Link
                to={insight.href}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {insight.cta}
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
