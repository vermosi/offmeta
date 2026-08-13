/**
 * Emerging intents and content opportunities.
 *
 * Clusters of real user searches ranked by demand and coverage gaps. Nothing
 * is auto-published: the admin identifies demand, a human creates the page.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConsoleHeading, ConsolePanel, EmptyRow, StatusTag } from '../components/console-ui';
import { scoreContentOpportunity, type IntentOpportunity } from '../lib/opportunity';

interface Props {
  opportunities: readonly IntentOpportunity[];
  isLoading: boolean;
  /** 'clusters' shows every intent; 'content' shows only uncovered demand. */
  mode: 'clusters' | 'content';
}

export function OpportunityQueue({ opportunities, isLoading, mode }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    return opportunities
      .filter((o) => !dismissed.has(o.signature))
      .filter((o) => (mode === 'content' ? !o.already_covered : true))
      .map((o) => ({ ...o, score: scoreContentOpportunity(o) }))
      .sort((a, b) => b.score - a.score);
  }, [opportunities, dismissed, mode]);

  return (
    <div className="space-y-6">
      <ConsoleHeading
        index="04"
        title={mode === 'content' ? 'SEO opportunities' : 'Query clusters'}
        note={
          mode === 'content'
            ? 'Demand with no landing page. Review before creating anything.'
            : 'How Magic players actually describe problems, clustered from real searches.'
        }
      />

      {isLoading && rows.length === 0 ? (
        <ConsolePanel>
          <div className="flex justify-center py-10">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        </ConsolePanel>
      ) : rows.length === 0 ? (
        <ConsolePanel>
          <EmptyRow>No clusters above the demand threshold yet.</EmptyRow>
        </ConsolePanel>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((row) => (
            <ConsolePanel
              key={row.signature}
              title={row.canonical_query}
              note={`${row.search_count} searches · ${row.variant_count} phrasings · ${row.searcher_count} searchers`}
              action={
                <StatusTag tone={row.score >= 60 ? 'good' : row.score >= 35 ? 'warn' : 'neutral'}>
                  {row.score}
                </StatusTag>
              }
            >
              <dl className="grid grid-cols-2 gap-1.5 font-mono text-[11px] text-muted-foreground">
                <div>
                  Zero results <span className="text-foreground">{row.zero_result_count}</span>
                </div>
                <div>
                  Landing page{' '}
                  <span className="text-foreground">
                    {row.already_covered ? 'exists' : 'none'}
                  </span>
                </div>
                <div className="col-span-2 truncate">
                  Suggested <span className="text-foreground">{row.suggested_slug}</span>
                </div>
              </dl>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-none font-mono text-[10px] uppercase tracking-[0.18em]"
                >
                  <Link to={`/admin/search/lab?q=${encodeURIComponent(row.canonical_query)}`}>
                    Preview index
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-none font-mono text-[10px] uppercase tracking-[0.18em]"
                  onClick={() => {
                    void navigator.clipboard.writeText(
                      JSON.stringify(
                        {
                          path: `/mtg/${row.suggested_slug}`,
                          canonicalQuery: row.canonical_query,
                          demand: row.search_count,
                          phrasings: row.variant_count,
                        },
                        null,
                        2,
                      ),
                    );
                    toast.success('Draft brief copied — review before publishing');
                  }}
                >
                  Create draft
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-none font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
                  onClick={() => setDismissed((prev) => new Set(prev).add(row.signature))}
                >
                  Dismiss
                </Button>
              </div>
            </ConsolePanel>
          ))}
        </div>
      )}
    </div>
  );
}
