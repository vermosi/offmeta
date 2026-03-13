/**
 * Conversion Funnel Panel for Admin Analytics.
 * Shows sessions → search → card_click → affiliate_click
 * with session-based drop-off rates and UTM source breakdown.
 *
 * Uses server-side aggregation to avoid the 1000-row query limit.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingDown, ArrowRight, Globe } from 'lucide-react';
import { logger } from '@/lib/core/logger';

interface FunnelStep {
  label: string;
  count: number;
  sessionCount: number;
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

/**
 * Fetches funnel counts using individual aggregation queries
 * to avoid the 1000-row limit on raw event fetches.
 */
async function fetchFunnelData(since: string) {
  const EVENT_GROUPS = {
    search: ['search'],
    card_click: ['card_click', 'card_modal_view'],
    affiliate_click: ['affiliate_click'],
  } as const;

  // Fetch total unique sessions
  const { data: allEvents, error: allErr } = await supabase
    .from('analytics_events')
    .select('session_id')
    .gte('created_at', since)
    .in('event_type', ['search', 'search_results', 'card_click', 'card_modal_view', 'affiliate_click']);

  if (allErr) throw allErr;

  // Since we can't do COUNT(DISTINCT) via the client, we need a different approach.
  // Fetch session_id lists per event type in parallel with pagination to handle >1000 rows.
  const sessionsByType = new Map<string, Set<string>>();
  const countByType = new Map<string, number>();
  const allSessions = new Set<string>();

  // Helper: paginated fetch of session_ids for given event types
  async function fetchAllSessionIds(eventTypes: readonly string[]) {
    const sessions = new Set<string>();
    let totalCount = 0;
    let from = 0;
    const PAGE_SIZE = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('session_id, event_type')
        .gte('created_at', since)
        .in('event_type', [...eventTypes])
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      for (const row of data) {
        const sid = row.session_id ?? 'unknown';
        sessions.add(sid);
        allSessions.add(sid);
        totalCount++;

        const type = row.event_type;
        if (!sessionsByType.has(type)) sessionsByType.set(type, new Set());
        sessionsByType.get(type)!.add(sid);
        countByType.set(type, (countByType.get(type) ?? 0) + 1);
      }

      hasMore = data.length === PAGE_SIZE;
      from += PAGE_SIZE;
    }

    return { sessions, totalCount };
  }

  // Fetch all relevant events with pagination
  await fetchAllSessionIds(['search', 'card_click', 'card_modal_view', 'affiliate_click']);

  // Also count total sessions from broader event set
  let from = 0;
  const PAGE_SIZE = 1000;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await supabase
      .from('analytics_events')
      .select('session_id')
      .gte('created_at', since)
      .in('event_type', ['search', 'search_results', 'card_click', 'card_modal_view', 'affiliate_click'])
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) allSessions.add(row.session_id ?? 'unknown');
    hasMore = data.length === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  const cardClickSessions = new Set([
    ...(sessionsByType.get('card_click') ?? []),
    ...(sessionsByType.get('card_modal_view') ?? []),
  ]);

  const steps: FunnelStep[] = [
    {
      label: 'Sessions',
      count: allSessions.size,
      sessionCount: allSessions.size,
    },
    {
      label: 'Searched',
      count: countByType.get('search') ?? 0,
      sessionCount: sessionsByType.get('search')?.size ?? 0,
    },
    {
      label: 'Clicked Card',
      count: (countByType.get('card_click') ?? 0) + (countByType.get('card_modal_view') ?? 0),
      sessionCount: cardClickSessions.size,
    },
    {
      label: 'Affiliate Click',
      count: countByType.get('affiliate_click') ?? 0,
      sessionCount: sessionsByType.get('affiliate_click')?.size ?? 0,
    },
  ];

  return { steps, allSessions };
}

/**
 * Fetches UTM source breakdown with pagination.
 */
async function fetchUtmData(since: string): Promise<UtmBreakdown[]> {
  const utmSessions = new Map<string, {
    searches: Set<string>;
    clicks: Set<string>;
    affiliates: Set<string>;
    allSessions: Set<string>;
  }>();

  let from = 0;
  const PAGE_SIZE = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('analytics_events')
      .select('event_type, session_id, event_data')
      .gte('created_at', since)
      .in('event_type', ['search', 'card_click', 'card_modal_view', 'affiliate_click'])
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const evt of data) {
      const evtData = evt.event_data as Record<string, unknown> | null;
      const utmSource = evtData?.utm_source as string | undefined;
      if (!utmSource) continue;

      const sid = evt.session_id ?? 'unknown';
      if (!utmSessions.has(utmSource)) {
        utmSessions.set(utmSource, {
          searches: new Set(),
          clicks: new Set(),
          affiliates: new Set(),
          allSessions: new Set(),
        });
      }
      const bucket = utmSessions.get(utmSource)!;
      bucket.allSessions.add(sid);
      if (evt.event_type === 'search') bucket.searches.add(sid);
      if (evt.event_type === 'card_click' || evt.event_type === 'card_modal_view') bucket.clicks.add(sid);
      if (evt.event_type === 'affiliate_click') bucket.affiliates.add(sid);
    }

    hasMore = data.length === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  const rows: UtmBreakdown[] = [];
  for (const [source, data] of utmSessions.entries()) {
    rows.push({
      source,
      sessions: data.allSessions.size,
      searches: data.searches.size,
      clicks: data.clicks.size,
      affiliates: data.affiliates.size,
    });
  }
  rows.sort((a, b) => b.sessions - a.sessions);
  return rows.slice(0, 10);
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
        const [funnelResult, utmResult] = await Promise.all([
          fetchFunnelData(since),
          fetchUtmData(since),
        ]);
        setFunnel(funnelResult.steps);
        setUtmBreakdown(utmResult);
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
                  {i > 0 && (
                    <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground pl-4">
                      <ArrowRight className="h-3 w-3" />
                      <span className={dropOff > 0 ? 'text-destructive font-medium' : 'text-muted-foreground font-medium'}>
                        {dropOff > 0 ? `-${dropOff}%` : `${dropOff}%`} drop-off
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
                      {step.count.toLocaleString()}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
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
