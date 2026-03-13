/**
 * Conversion Funnel Panel for Admin Analytics.
 * Uses the `get_conversion_funnel` RPC for server-side aggregation.
 * Supports both sequential and independent (all-activity) funnel views.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingDown, ArrowRight, Globe } from 'lucide-react';
import { logger } from '@/lib/core/logger';

interface FunnelCounts {
  totalSessions: number;
  searchedSessions: number;
  clickedSessions: number;
  affiliateSessions: number;
}

interface FunnelStep {
  label: string;
  sessionCount: number;
  totalEvents: number;
}

interface UtmRow {
  source: string;
  sessions: number;
  searches: number;
  clicks: number;
  affiliates: number;
}

type FunnelMode = 'sequential' | 'independent';

interface ConversionFunnelPanelProps {
  days: number;
}

export function ConversionFunnelPanel({ days }: ConversionFunnelPanelProps) {
  const [sequential, setSequential] = useState<FunnelCounts | null>(null);
  const [independent, setIndependent] = useState<FunnelCounts | null>(null);
  const [eventTotals, setEventTotals] = useState<Record<string, number>>({});
  const [utmBreakdown, setUtmBreakdown] = useState<UtmRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<FunnelMode>('sequential');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_conversion_funnel' as 'get_search_analytics', {
          days_back: days,
        } as never);

        if (error) throw error;

        const result = data as unknown as {
          sequential: FunnelCounts;
          independent: FunnelCounts;
          eventTotals: Record<string, number> | null;
          utmSources: UtmRow[];
        };

        setSequential(result.sequential);
        setIndependent(result.independent);
        setEventTotals(result.eventTotals ?? {});
        setUtmBreakdown(result.utmSources ?? []);
      } catch (e) {
        logger.warn('Failed to fetch funnel data', e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [days]);

  if (loading) {
    return (
      <Card className="border-border/40">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const activeCounts = mode === 'sequential' ? sequential : independent;
  if (!activeCounts) return null;

  const searchEvents = (eventTotals['search'] ?? 0);
  const clickEvents = (eventTotals['card_click'] ?? 0) + (eventTotals['card_modal_view'] ?? 0);
  const affiliateEvents = (eventTotals['affiliate_click'] ?? 0);

  const funnel: FunnelStep[] = [
    { label: 'Sessions', sessionCount: activeCounts.totalSessions, totalEvents: activeCounts.totalSessions },
    { label: 'Searched', sessionCount: activeCounts.searchedSessions, totalEvents: searchEvents },
    { label: 'Clicked Card', sessionCount: activeCounts.clickedSessions, totalEvents: clickEvents },
    { label: 'Affiliate Click', sessionCount: activeCounts.affiliateSessions, totalEvents: affiliateEvents },
  ];

  const totalSessions = funnel[0]?.sessionCount ?? 1;

  return (
    <div className="space-y-4">
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-primary" />
              Conversion Funnel ({days}d)
            </CardTitle>
            <div className="flex rounded-lg border border-border/50 overflow-hidden text-xs">
              <button
                onClick={() => setMode('sequential')}
                className={`px-3 py-1 transition-colors ${
                  mode === 'sequential'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted/50'
                }`}
              >
                Sequential
              </button>
              <button
                onClick={() => setMode('independent')}
                className={`px-3 py-1 transition-colors border-l border-border/50 ${
                  mode === 'independent'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted/50'
                }`}
              >
                All Activity
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {funnel.map((step, i) => {
              const pct = totalSessions > 0
                ? Math.round((step.sessionCount / totalSessions) * 100)
                : 0;
              const prevCount = i > 0 ? funnel[i - 1].sessionCount : 0;
              const dropOff = i > 0 && prevCount > 0
                ? Math.round(((prevCount - step.sessionCount) / prevCount) * 100)
                : 0;

              return (
                <div key={step.label}>
                  {i > 0 && (
                    <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground pl-4">
                      <ArrowRight className="h-3 w-3" />
                      <span className={dropOff > 0 ? 'text-destructive font-medium' : 'text-muted-foreground font-medium'}>
                        -{dropOff}% drop-off
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-28 text-sm font-medium text-foreground">{step.label}</div>
                    <div className="flex-1 relative h-7 rounded bg-muted/50 overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded bg-primary/20 transition-all"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                      <div className="absolute inset-0 flex items-center px-2 text-xs font-mono">
                        <span className="text-foreground">{step.sessionCount.toLocaleString()} sessions</span>
                        <span className="ml-auto text-muted-foreground">{pct}%</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs tabular-nums w-16 justify-center">
                      {step.totalEvents.toLocaleString()}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            {mode === 'sequential'
              ? 'Sequential: each step only counts sessions that completed all previous steps.'
              : 'All Activity: each step counts sessions independently (a card click doesn\'t require a search).'}
          </p>
        </CardContent>
      </Card>

      {utmBreakdown.length > 0 && (
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              UTM Source Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-xs border-b border-border/40">
                    <th className="text-left pb-2 font-medium">Source</th>
                    <th className="text-right pb-2 font-medium">Sessions</th>
                    <th className="text-right pb-2 font-medium">Searched</th>
                    <th className="text-right pb-2 font-medium">Clicked</th>
                    <th className="text-right pb-2 font-medium">Affiliate</th>
                  </tr>
                </thead>
                <tbody>
                  {utmBreakdown.map((row) => (
                    <tr key={row.source} className="border-b border-border/20">
                      <td className="py-1.5 font-medium text-foreground">{row.source}</td>
                      <td className="py-1.5 text-right tabular-nums">{row.sessions}</td>
                      <td className="py-1.5 text-right tabular-nums">{row.searches}</td>
                      <td className="py-1.5 text-right tabular-nums">{row.clicks}</td>
                      <td className="py-1.5 text-right tabular-nums">{row.affiliates}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
