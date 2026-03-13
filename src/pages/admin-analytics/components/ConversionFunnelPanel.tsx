/**
 * Conversion Funnel Panel for Admin Analytics.
 * Shows landing → search → card_click → affiliate_click
 * with session-based drop-off rates and UTM source breakdown.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingDown, ArrowRight, Globe } from 'lucide-react';
import { logger } from '@/lib/core/logger';

interface FunnelStep {
  label: string;
  eventType: string;
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

export function ConversionFunnelPanel({ days }: ConversionFunnelPanelProps) {
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [utmBreakdown, setUtmBreakdown] = useState<UtmBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFunnel() {
      setLoading(true);
      try {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        // Fetch all events in the period grouped by event_type and session
        const { data: events, error } = await supabase
          .from('analytics_events')
          .select('event_type, session_id, event_data')
          .gte('created_at', since)
          .in('event_type', ['search', 'search_results', 'card_click', 'card_modal_view', 'affiliate_click']);

        if (error) throw error;

        // Count unique sessions per event type
        const sessionsByType = new Map<string, Set<string>>();
        const countByType = new Map<string, number>();
        const utmSessions = new Map<string, { searches: Set<string>; clicks: Set<string>; affiliates: Set<string>; allSessions: Set<string> }>();

        for (const evt of events ?? []) {
          const sid = evt.session_id ?? 'unknown';
          const type = evt.event_type;

          if (!sessionsByType.has(type)) sessionsByType.set(type, new Set());
          sessionsByType.get(type)!.add(sid);
          countByType.set(type, (countByType.get(type) ?? 0) + 1);

          // Track UTM sources
          const data = evt.event_data as Record<string, unknown> | null;
          const utmSource = data?.utm_source as string | undefined;
          if (utmSource) {
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
            if (type === 'search') bucket.searches.add(sid);
            if (type === 'card_click' || type === 'card_modal_view') bucket.clicks.add(sid);
            if (type === 'affiliate_click') bucket.affiliates.add(sid);
          }
        }

        // Get total unique sessions
        const allSessions = new Set<string>();
        for (const evt of events ?? []) {
          allSessions.add(evt.session_id ?? 'unknown');
        }

        const steps: FunnelStep[] = [
          {
            label: 'Sessions',
            eventType: 'all',
            count: allSessions.size,
            sessionCount: allSessions.size,
          },
          {
            label: 'Searched',
            eventType: 'search',
            count: countByType.get('search') ?? 0,
            sessionCount: sessionsByType.get('search')?.size ?? 0,
          },
          {
            label: 'Clicked Card',
            eventType: 'card_click',
            count: (countByType.get('card_click') ?? 0) + (countByType.get('card_modal_view') ?? 0),
            sessionCount: new Set([
              ...(sessionsByType.get('card_click') ?? []),
              ...(sessionsByType.get('card_modal_view') ?? []),
            ]).size,
          },
          {
            label: 'Affiliate Click',
            eventType: 'affiliate_click',
            count: countByType.get('affiliate_click') ?? 0,
            sessionCount: sessionsByType.get('affiliate_click')?.size ?? 0,
          },
        ];

        setFunnel(steps);

        // Build UTM breakdown
        const utmRows: UtmBreakdown[] = [];
        for (const [source, data] of utmSessions.entries()) {
          utmRows.push({
            source,
            sessions: data.allSessions.size,
            searches: data.searches.size,
            clicks: data.clicks.size,
            affiliates: data.affiliates.size,
          });
        }
        utmRows.sort((a, b) => b.sessions - a.sessions);
        setUtmBreakdown(utmRows.slice(0, 10));
      } catch (e) {
        logger.warn('Failed to fetch funnel data', e);
      } finally {
        setLoading(false);
      }
    }

    fetchFunnel();
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
      {/* Conversion Funnel */}
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
              const dropOff = i > 0
                ? Math.round(((funnel[i - 1].sessionCount - step.sessionCount) / Math.max(funnel[i - 1].sessionCount, 1)) * 100)
                : 0;

              return (
                <div key={step.label}>
                  {i > 0 && (
                    <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground pl-4">
                      <ArrowRight className="h-3 w-3" />
                      <span className="text-destructive font-medium">-{dropOff}% drop-off</span>
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

      {/* UTM Source Breakdown */}
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
