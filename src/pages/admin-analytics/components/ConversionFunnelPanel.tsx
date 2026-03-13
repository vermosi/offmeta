/**
 * Conversion Funnel Panel for Admin Analytics.
 * Shows a sequential funnel: sessions → search → card_click → affiliate_click.
 * Each step only counts sessions that also completed the previous step.
 *
 * Uses paginated fetching to avoid the 1000-row query limit.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingDown, ArrowRight, Globe } from 'lucide-react';
import { logger } from '@/lib/core/logger';

interface FunnelStep {
  label: string;
  sessionCount: number;
  totalEvents: number;
}

interface UtmBreakdown {
  source: string;
  sessions: number;
  searches: number;
  clicks: number;
  affiliates: number;
}

interface ConversionFunnelPanelProps {
  days: number;
}

const FUNNEL_EVENT_TYPES = ['search', 'card_click', 'card_modal_view', 'affiliate_click'] as const;

/** Paginated fetch of all relevant events in the period. */
async function fetchAllEvents(since: string) {
  const allEvents: Array<{ event_type: string; session_id: string; utm_source?: string }> = [];
  let from = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('analytics_events')
      .select('event_type, session_id, event_data')
      .gte('created_at', since)
      .in('event_type', [...FUNNEL_EVENT_TYPES])
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const row of data) {
      const evtData = row.event_data as Record<string, unknown> | null;
      allEvents.push({
        event_type: row.event_type,
        session_id: row.session_id ?? 'unknown',
        utm_source: evtData?.utm_source as string | undefined,
      });
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allEvents;
}

export function ConversionFunnelPanel({ days }: ConversionFunnelPanelProps) {
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [utmBreakdown, setUtmBreakdown] = useState<UtmBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        const events = await fetchAllEvents(since);

        // Build per-session event sets
        const sessionEvents = new Map<string, Set<string>>();
        const eventCounts = new Map<string, number>();

        for (const evt of events) {
          if (!sessionEvents.has(evt.session_id)) sessionEvents.set(evt.session_id, new Set());
          sessionEvents.get(evt.session_id)!.add(evt.event_type);
          eventCounts.set(evt.event_type, (eventCounts.get(evt.event_type) ?? 0) + 1);
        }

        const totalSessions = sessionEvents.size;

        // Sequential funnel: each step requires the previous
        const searchedSessions = new Set<string>();
        const clickedSessions = new Set<string>();
        const affiliateSessions = new Set<string>();

        for (const [sid, types] of sessionEvents) {
          if (types.has('search')) {
            searchedSessions.add(sid);
            if (types.has('card_click') || types.has('card_modal_view')) {
              clickedSessions.add(sid);
              if (types.has('affiliate_click')) {
                affiliateSessions.add(sid);
              }
            }
          }
        }

        const steps: FunnelStep[] = [
          { label: 'Sessions', sessionCount: totalSessions, totalEvents: totalSessions },
          {
            label: 'Searched',
            sessionCount: searchedSessions.size,
            totalEvents: eventCounts.get('search') ?? 0,
          },
          {
            label: 'Clicked Card',
            sessionCount: clickedSessions.size,
            totalEvents: (eventCounts.get('card_click') ?? 0) + (eventCounts.get('card_modal_view') ?? 0),
          },
          {
            label: 'Affiliate Click',
            sessionCount: affiliateSessions.size,
            totalEvents: eventCounts.get('affiliate_click') ?? 0,
          },
        ];

        setFunnel(steps);

        // UTM breakdown (independent, not sequential)
        const utmMap = new Map<string, {
          allSessions: Set<string>;
          searches: Set<string>;
          clicks: Set<string>;
          affiliates: Set<string>;
        }>();

        for (const evt of events) {
          if (!evt.utm_source) continue;
          if (!utmMap.has(evt.utm_source)) {
            utmMap.set(evt.utm_source, {
              allSessions: new Set(), searches: new Set(), clicks: new Set(), affiliates: new Set(),
            });
          }
          const b = utmMap.get(evt.utm_source)!;
          b.allSessions.add(evt.session_id);
          if (evt.event_type === 'search') b.searches.add(evt.session_id);
          if (evt.event_type === 'card_click' || evt.event_type === 'card_modal_view') b.clicks.add(evt.session_id);
          if (evt.event_type === 'affiliate_click') b.affiliates.add(evt.session_id);
        }

        const utmRows: UtmBreakdown[] = [...utmMap.entries()].map(([source, d]) => ({
          source,
          sessions: d.allSessions.size,
          searches: d.searches.size,
          clicks: d.clicks.size,
          affiliates: d.affiliates.size,
        })).sort((a, b) => b.sessions - a.sessions).slice(0, 10);

        setUtmBreakdown(utmRows);
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

  const totalSessions = funnel[0]?.sessionCount ?? 1;

  return (
    <div className="space-y-4">
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-primary" />
            Conversion Funnel ({days}d)
          </CardTitle>
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
                  {i > 0 && dropOff > 0 && (
                    <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground pl-4">
                      <ArrowRight className="h-3 w-3" />
                      <span className="text-destructive font-medium">-{dropOff}% drop-off</span>
                    </div>
                  )}
                  {i > 0 && dropOff <= 0 && (
                    <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground pl-4">
                      <ArrowRight className="h-3 w-3" />
                      <span className="text-muted-foreground font-medium">0% drop-off</span>
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
            Sequential funnel: each step only counts sessions that completed all previous steps.
            Badge shows total event count (non-sequential).
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
