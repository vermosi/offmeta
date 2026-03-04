/**
 * Admin panel showing auth failure metrics from analytics_events.
 * Displays failure rate, last error, and top failing error reasons.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ShieldAlert, RefreshCw, AlertTriangle } from 'lucide-react';
import { StatCard, BarRow } from './AnalyticsPrimitives';

interface AuthFailureEvent {
  id: string;
  created_at: string;
  event_data: {
    error?: string;
    origin?: string;
    user_agent_prefix?: string;
    function_name?: string;
  };
}

interface AuthFailureStats {
  total: number;
  last24h: number;
  lastError: string | null;
  lastErrorTime: string | null;
  errorBreakdown: Record<string, number>;
}

export function AuthFailuresPanel({ days }: { days: number }) {
  const [stats, setStats] = useState<AuthFailureStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const since = new Date(
        Date.now() - days * 24 * 60 * 60 * 1000,
      ).toISOString();
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: allEvents } = await supabase
        .from('analytics_events')
        .select('id, created_at, event_data')
        .eq('event_type', 'auth_failure')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(500);

      const events = (allEvents ?? []) as unknown as AuthFailureEvent[];

      const last24h = events.filter((e) => e.created_at >= since24h).length;

      const errorBreakdown: Record<string, number> = {};
      for (const e of events) {
        const reason = e.event_data?.error ?? 'Unknown';
        errorBreakdown[reason] = (errorBreakdown[reason] ?? 0) + 1;
      }

      const lastEvent = events[0] ?? null;

      setStats({
        total: events.length,
        last24h,
        lastError: lastEvent?.event_data?.error ?? null,
        lastErrorTime: lastEvent?.created_at ?? null,
        errorBreakdown,
      });
    } catch {
      // fail silently
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const sortedErrors = stats
    ? Object.entries(stats.errorBreakdown)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
    : [];

  return (
    <div className="surface-elevated p-5 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          Auth Failures
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetch}
          disabled={isLoading}
          className="h-7 w-7 p-0"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
          />
        </Button>
      </div>

      {!stats ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : stats.total === 0 ? (
        <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
          <ShieldAlert className="h-5 w-5 opacity-50" />
          <p className="text-xs">No auth failures in the last {days} days</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={AlertTriangle}
              label="Total Failures"
              value={stats.total}
              subtext={`Last ${days} days`}
              variant={stats.total > 50 ? 'danger' : stats.total > 10 ? 'warning' : 'default'}
            />
            <StatCard
              icon={AlertTriangle}
              label="Last 24h"
              value={stats.last24h}
              variant={stats.last24h > 20 ? 'danger' : stats.last24h > 5 ? 'warning' : 'default'}
            />
          </div>

          {stats.lastError && (
            <div className="text-xs space-y-1">
              <span className="text-muted-foreground font-medium">Last error:</span>
              <p className="text-foreground font-mono bg-muted px-2 py-1 rounded text-[11px] break-all">
                {stats.lastError}
              </p>
              {stats.lastErrorTime && (
                <p className="text-muted-foreground text-[10px]">
                  {new Date(stats.lastErrorTime).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {sortedErrors.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground font-medium">
                Top error reasons
              </span>
              {sortedErrors.map(([reason, count]) => (
                <BarRow
                  key={reason}
                  label={reason}
                  value={count}
                  total={stats.total}
                  color="bg-destructive"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
