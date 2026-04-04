/**
 * AI Cost Monitoring Panel — shows token usage by model and function.
 * Calls the get_ai_usage_stats() RPC.
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RefreshCw, Brain, Cpu, Zap, Clock, BarChart3 } from 'lucide-react';
import { StatCard, BarRow } from './AnalyticsPrimitives';
import { logger } from '@/lib/core/logger';
import { parseAIUsageStatsData } from '@/lib/supabase/parsers';

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

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_ai_usage_stats', {
        days_back: days,
      });
      if (error) throw error;
      const parsed = parseAIUsageStatsData(data);
      if (!parsed) {
        logger.error('[AICostPanel] Invalid RPC payload shape', {
          days,
          payload: data,
        });
        setStats(null);
        return;
      }
      setStats(parsed);
    } catch (err) {
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

      {!stats ? (
        <p className="text-sm text-muted-foreground">
          {loading ? 'Loading…' : 'No data available'}
        </p>
      ) : (
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
                <p className="text-xs text-muted-foreground">No model data</p>
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
    </div>
  );
}
