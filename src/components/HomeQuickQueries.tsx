/**
 * HomeQuickQueries — the single prompt surface on the homepage.
 *
 * Sits directly under the search bar so a cold mobile visitor sees headline →
 * search → one-tap queries above the fold, with nothing competing for the tap.
 * Queries mirror what people actually search here, taken from the top real
 * queries in analytics.
 */

import { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useAnalytics } from '@/hooks/useAnalytics';
import { markOnce } from '@/lib/analytics/oncePerSession';

interface HomeQuickQueriesProps {
  onTrySearch: (query: string) => void;
}

export function HomeQuickQueries({ onTrySearch }: HomeQuickQueriesProps) {
  const { t } = useTranslation();
  const { trackExampleQueryImpression, trackExampleQueryClick } =
    useAnalytics();

  const queries = [
    t('quickQueries.q1', 'budget board wipes under $5'),
    t('quickQueries.q2', 'cards like Rhystic Study under $5'),
    t('quickQueries.q3', 'cards that protect my commander'),
    t('quickQueries.q4', 'green ramp for Commander'),
  ];

  useEffect(() => {
    if (!markOnce('home_quick_queries_impression')) return;
    trackExampleQueryImpression({
      query: 'home_quick_queries',
      category: 'home_quick',
      visible_count: queries.length,
    });
    // Impression is once per session; query list is static.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackExampleQueryImpression]);

  return (
    <div className="flex flex-wrap gap-2">
      <span className="sr-only">
        {t('quickQueries.label', 'Popular searches')}
      </span>
      {queries.map((query, index) => (
        <button
          key={query}
          type="button"
          onClick={() => {
            trackExampleQueryClick({
              query,
              category: 'home_quick',
              position: index,
              visible_count: queries.length,
            });
            onTrySearch(query);
          }}
          className="group inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
        >
          <span>{query}</span>
          <ArrowRight
            className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </button>
      ))}
    </div>
  );
}
