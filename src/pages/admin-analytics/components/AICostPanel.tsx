/**
 * AI Cost Monitoring Panel — shows token usage by model and function.
 * Calls the get_ai_usage_stats() RPC.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  RefreshCw,
  Brain,
  Cpu,
  Zap,
  Clock,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/core/logger';
import { BarRow, StatCard } from './AnalyticsPrimitives';

interface UsageSummary {
  total_requests: number;
  total_tokens: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  avg_duration_ms: number;
  total_retries: number;
}

interface ModelRow {
  model: string;
  request_count: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  avg_duration_ms: number;
  total_retries: number;
}

interface FunctionRow {
  function_name: string;
  request_count: number;
  total_tokens: number;
  avg_duration_ms: number;
}

interface DailyRow {
  day: string;
  tokens: number;
  requests: number;
}

interface AIUsageStats {
  summary: UsageSummary;
  byModel: ModelRow[];
  byFunction: FunctionRow[];
  daily: DailyRow[];
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function AICostPanel({ days }: { days: number }) {
  const [stats, setStats] = useState<AIUsageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('admin-rpc', {
        body: { fn: 'get_ai_usage_stats', args: { days_back: days } },
      });
      if (error) throw error;
      setStats((data as { data: AIUsageStats }).data);
    } catch (err) {
      setStats(null);
      setError(
        err instanceof Error ? err.message : 'Failed to load AI usage stats',
      );
      logger.error('[AICostPanel] Failed to load AI usage stats:', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const summary = stats?.summary;
  const maxModelTokens = Math.max(
    ...(stats?.byModel?.map((m) => m.total_tokens) ?? [1]),
  );
  const maxFnTokens = Math.max(
    ...(stats?.byFunction?.map((f) => f.total_tokens) ?? [1]),
  );

  return (
    <div className="surface-elevated p-5 border border-border space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Brain className="h-4 w-4" />
          AI Cost Monitoring
          {error && (
            <Badge variant="destructive" className="ml-1 text-[10px] uppercase">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Degraded
            </Badge>
          )}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchStats}
          disabled={loading}
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading && !stats ? (
        <div className="space-y-3 animate-pulse" aria-live="polite">
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="h-24 rounded-lg bg-muted/70" />
            <div className="h-24 rounded-lg bg-muted/70" />
            <div className="h-24 rounded-lg bg-muted/70" />
            <div className="h-24 rounded-lg bg-muted/70" />
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div className="flex items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <p>Failed to load AI usage stats: {error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStats}
                disabled={loading}
                className="shrink-0"
              >
                Retry
              </Button>
            </div>
          )}

          {!stats && !error && !loading && (
            <p className="text-sm text-muted-foreground">
              No AI usage data is available yet.
            </p>
          )}

          {stats && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  icon={Zap}
                  label="Total Requests"
                  value={summary?.total_requests ?? 0}
                  subtext={`${summary?.total_retries ?? 0} retries`}
                />
                <StatCard
                  icon={BarChart3}
                  label="Total Tokens"
                  value={formatTokens(summary?.total_tokens ?? 0)}
                  subtext={`${formatTokens(summary?.total_prompt_tokens ?? 0)} in / ${formatTokens(summary?.total_completion_tokens ?? 0)} out`}
                />
                <StatCard
                  icon={Clock}
                  label="Avg Latency"
                  value={`${summary?.avg_duration_ms ?? 0}ms`}
                />
                <StatCard
                  icon={Cpu}
                  label="Models Used"
                  value={stats.byModel?.length ?? 0}
                />
              </div>

              {/* By Model */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Usage by Model
                </h3>
                <div className="space-y-2">
                  {stats.byModel?.map((m) => (
                    <div key={m.model} className="space-y-1">
                      <BarRow
                        label={m.model.replace(/^(google|openai)\//, '')}
                        value={m.total_tokens}
                        total={maxModelTokens}
                        color="hsl(var(--primary))"
                      />
                      <div className="flex gap-3 text-[10px] text-muted-foreground pl-1">
                        <span>{m.request_count} reqs</span>
                        <span>{formatTokens(m.prompt_tokens)} in</span>
                        <span>{formatTokens(m.completion_tokens)} out</span>
                        <span>{m.avg_duration_ms}ms avg</span>
                      </div>
                    </div>
                  ))}
                  {(!stats.byModel || stats.byModel.length === 0) && (
                    <p className="text-xs text-muted-foreground">
                      No model data
                    </p>
                  )}
                </div>
              </div>

              {/* By Function */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Usage by Function
                </h3>
                <div className="space-y-2">
                  {stats.byFunction?.map((f) => (
                    <div key={f.function_name} className="space-y-1">
                      <BarRow
                        label={f.function_name}
                        value={f.total_tokens}
                        total={maxFnTokens}
                        color="hsl(var(--accent))"
                      />
                      <div className="flex gap-3 text-[10px] text-muted-foreground pl-1">
                        <span>{f.request_count} reqs</span>
                        <span>{f.avg_duration_ms}ms avg</span>
                      </div>
                    </div>
                  ))}
                  {(!stats.byFunction || stats.byFunction.length === 0) && (
                    <p className="text-xs text-muted-foreground">
                      No function data
                    </p>
                  )}
                </div>
              </div>
              {/* Daily sparkline table */}
              {stats.daily && stats.daily.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Daily Usage (last {days}d)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-1 text-muted-foreground font-medium">
                            Date
                          </th>
                          <th className="text-right py-1 text-muted-foreground font-medium">
                            Requests
                          </th>
                          <th className="text-right py-1 text-muted-foreground font-medium">
                            Tokens
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.daily.map((d) => (
                          <tr key={d.day} className="border-b border-border/50">
                            <td className="py-1 text-foreground">{d.day}</td>
                            <td className="text-right py-1 tabular-nums text-muted-foreground">
                              {d.requests}
                            </td>
                            <td className="text-right py-1 tabular-nums text-foreground">
                              {formatTokens(d.tokens)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
