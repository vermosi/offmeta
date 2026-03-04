/**
 * Lightweight health indicator that pings the semantic-search edge function
 * to show whether AI translation is live or falling back to deterministic.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sparkles, Cpu, AlertCircle, RefreshCw } from 'lucide-react';

type HealthStatus = 'idle' | 'checking' | 'ai' | 'deterministic' | 'error';

export function PipelineHealthIndicator() {
  const [status, setStatus] = useState<HealthStatus>('idle');
  const [detail, setDetail] = useState('');
  const [latency, setLatency] = useState<number | null>(null);

  const check = useCallback(async () => {
    setStatus('checking');
    setDetail('');
    setLatency(null);
    const start = performance.now();

    try {
      const { data, error } = await supabase.functions.invoke(
        'semantic-search',
        {
          body: { query: 'cheap green ramp spells', filters: {} },
        },
      );
      const ms = Math.round(performance.now() - start);
      setLatency(ms);

      if (error) {
        setStatus('error');
        setDetail(error.message ?? 'Unknown error');
        return;
      }

      const source: string = data?.source ?? 'unknown';
      if (source === 'ai' || source === 'llm' || source === 'cache') {
        setStatus('ai');
        setDetail(`Source: ${source} · ${ms}ms`);
      } else {
        setStatus('deterministic');
        setDetail(`Source: ${source} · ${ms}ms`);
      }
    } catch (err) {
      setStatus('error');
      setDetail(err instanceof Error ? err.message : 'Network error');
    }
  }, []);

  const config: Record<
    Exclude<HealthStatus, 'idle' | 'checking'>,
    { icon: typeof Sparkles; label: string; classes: string }
  > = {
    ai: {
      icon: Sparkles,
      label: 'AI Translation Live',
      classes:
        'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    },
    deterministic: {
      icon: Cpu,
      label: 'Deterministic Fallback',
      classes:
        'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    },
    error: {
      icon: AlertCircle,
      label: 'Pipeline Error',
      classes:
        'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
    },
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        onClick={check}
        disabled={status === 'checking'}
        className="gap-1.5 h-8 text-xs"
      >
        <RefreshCw
          className={`h-3 w-3 ${status === 'checking' ? 'animate-spin' : ''}`}
        />
        {status === 'checking' ? 'Pinging…' : 'Check Pipeline'}
      </Button>

      {status !== 'idle' && status !== 'checking' && (() => {
        const c = config[status];
        const Icon = c.icon;
        return (
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full border px-2.5 py-1 ${c.classes}`}
          >
            <Icon className="h-3 w-3" />
            {c.label}
            {latency !== null && (
              <span className="text-[10px] opacity-70">{latency}ms</span>
            )}
          </span>
        );
      })()}

      {detail && status === 'error' && (
        <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
          {detail}
        </span>
      )}
    </div>
  );
}
