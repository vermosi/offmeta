/**
 * Admin panel showing local DB vs Scryfall API hit rates.
 * Shows current session data + historical data from analytics_events.
 * @module pages/admin-analytics/components/HitRatePanel
 */

import { useState, useCallback, useRef } from 'react';
import { Database, Globe, History, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  getHitRateStats,
  clearHitRateStats,
  forceFlushHitRates,
  type HitOperation,
  type HitSource,
} from '@/services/hit-rate-tracker';

const OP_LABELS: Record<HitOperation, string> = {
  card_by_name: 'Card by Name',
  cards_batch: 'Batch Lookup',
  autocomplete: 'Autocomplete',
  random_card: 'Random Card',
  price_lookup: 'Price Lookup',
};

interface HistoricalStats {
  local: number;
  scryfall: number;
  cache: number;
  total: number;
  localPercent: number;
  byOperation: Record<HitOperation, { local: number; scryfall: number; cache: number }>;
  sessionCount: number;
}

const EMPTY_HISTORICAL: HistoricalStats = {
  local: 0, scryfall: 0, cache: 0, total: 0, localPercent: 0, sessionCount: 0,
  byOperation: {
    card_by_name: { local: 0, scryfall: 0, cache: 0 },
    cards_batch: { local: 0, scryfall: 0, cache: 0 },
    autocomplete: { local: 0, scryfall: 0, cache: 0 },
    random_card: { local: 0, scryfall: 0, cache: 0 },
    price_lookup: { local: 0, scryfall: 0, cache: 0 },
  },
};

async function fetchHistoricalStats(): Promise<HistoricalStats> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('analytics_events')
    .select('event_data, session_id')
    .eq('event_type', 'hit_rate')
    .gte('created_at', since);

  if (error || !data) return EMPTY_HISTORICAL;

  const stats = { ...EMPTY_HISTORICAL, byOperation: { ...EMPTY_HISTORICAL.byOperation } };
  // Deep-copy byOperation
  for (const op of Object.keys(stats.byOperation) as HitOperation[]) {
    stats.byOperation[op] = { local: 0, scryfall: 0, cache: 0 };
  }

  const sessions = new Set<string>();

  for (const row of data) {
    const d = row.event_data as { source?: string; operation?: string; count?: number } | null;
    if (!d || !d.source || !d.operation) continue;

    const source = d.source as HitSource;
    const operation = d.operation as HitOperation;
    const count = typeof d.count === 'number' ? d.count : 1;

    if (source === 'local') stats.local += count;
    else if (source === 'scryfall') stats.scryfall += count;
    else if (source === 'cache') stats.cache += count;

    if (stats.byOperation[operation]) {
      stats.byOperation[operation][source] += count;
    }

    if (row.session_id) sessions.add(row.session_id);
  }

  stats.total = stats.local + stats.scryfall + stats.cache;
  stats.localPercent = stats.total > 0 ? Math.round((stats.local / stats.total) * 100) : 0;
  stats.sessionCount = sessions.size;

  return stats;
}

function HitBar({ local, cache, scryfall, total }: { local: number; cache: number; scryfall: number; total: number }) {
  const barWidth = (value: number) =>
    total > 0 ? `${Math.max((value / total) * 100, 0.5)}%` : '0%';

  return (
    <div className="h-3 rounded-full overflow-hidden bg-muted flex">
      {local > 0 && (
        <div className="bg-emerald-500 transition-all" style={{ width: barWidth(local) }} title={`Local: ${local}`} />
      )}
      {cache > 0 && (
        <div className="bg-sky-500 transition-all" style={{ width: barWidth(cache) }} title={`Cache: ${cache}`} />
      )}
      {scryfall > 0 && (
        <div className="bg-amber-500 transition-all" style={{ width: barWidth(scryfall) }} title={`Scryfall: ${scryfall}`} />
      )}
    </div>
  );
}

function HitLegend({ local, cache, scryfall }: { local: number; cache: number; scryfall: number }) {
  return (
    <div className="flex gap-4 mt-1.5 text-[10px] text-muted-foreground">
      <span className="flex items-center gap-1">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
        Local ({local.toLocaleString()})
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-2 w-2 rounded-full bg-sky-500" />
        Cache ({cache.toLocaleString()})
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
        Scryfall ({scryfall.toLocaleString()})
      </span>
    </div>
  );
}

function OperationBreakdown({
  byOperation,
}: {
  byOperation: Record<HitOperation, { local: number; scryfall: number; cache: number }>;
}) {
  const barWidth = (value: number, total: number) =>
    total > 0 ? `${Math.max((value / total) * 100, 0.5)}%` : '0%';

  const entries = (Object.entries(byOperation) as [HitOperation, { local: number; scryfall: number; cache: number }][])
    .filter(([, v]) => v.local + v.scryfall + v.cache > 0);

  if (entries.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <Globe className="h-3.5 w-3.5" />
        By Operation
      </h3>
      {entries.map(([op, v]) => {
        const opTotal = v.local + v.scryfall + v.cache;
        const pct = Math.round((v.local / opTotal) * 100);
        return (
          <div key={op} className="flex items-center gap-2">
            <span className="text-xs text-foreground w-28 truncate">{OP_LABELS[op]}</span>
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden flex">
              {v.local > 0 && <div className="bg-emerald-500" style={{ width: barWidth(v.local, opTotal) }} />}
              {v.cache > 0 && <div className="bg-sky-500" style={{ width: barWidth(v.cache, opTotal) }} />}
              {v.scryfall > 0 && <div className="bg-amber-500" style={{ width: barWidth(v.scryfall, opTotal) }} />}
            </div>
            <span className="text-[10px] text-muted-foreground w-12 text-right tabular-nums">{pct}% local</span>
          </div>
        );
      })}
    </div>
  );
}

export function HitRatePanel() {
  const [stats, setStats] = useState(() => getHitRateStats());
  const [historical, setHistorical] = useState<HistoricalStats>(EMPTY_HISTORICAL);
  const [loadingHistorical, setLoadingHistorical] = useState(true);
  const [shouldLoad, setShouldLoad] = useState(true);

  const loadHistorical = useCallback(async () => {
    setLoadingHistorical(true);
    const data = await fetchHistoricalStats();
    setHistorical(data);
    setLoadingHistorical(false);
  }, []);

  // Trigger initial load via state flag instead of calling setState in effect
  if (shouldLoad) {
    setShouldLoad(false);
    loadHistorical();
  }

  const refresh = useCallback(async () => {
    await forceFlushHitRates();
    setStats(getHitRateStats());
    loadHistorical();
  }, [loadHistorical]);

  const clear = useCallback(() => {
    clearHitRateStats();
    setStats(getHitRateStats());
  }, []);

  return (
    <div className="surface-elevated p-5 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Database className="h-4 w-4" />
          Local DB vs Scryfall Hit Rate
        </h2>
        <div className="flex gap-1.5">
          <Button variant="ghost" size="sm" onClick={refresh} className="h-7 px-2">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={clear} className="h-7 px-2">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Current session */}
      {stats.total === 0 ? (
        <p className="text-sm text-muted-foreground">
          No session data yet. Browse the app to generate hit rate data.
        </p>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">
                {stats.total.toLocaleString()} session lookups
              </span>
              <span className="font-semibold text-foreground">{stats.localPercent}% local</span>
            </div>
            <HitBar local={stats.local} cache={stats.cache} scryfall={stats.scryfall} total={stats.total} />
            <HitLegend local={stats.local} cache={stats.cache} scryfall={stats.scryfall} />
          </div>
          <OperationBreakdown byOperation={stats.byOperation} />
        </div>
      )}

      {/* Historical (all sessions, last 30 days) */}
      <div className="mt-5 pt-4 border-t border-border">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-3">
          <History className="h-3.5 w-3.5" />
          Historical (30 days, all sessions)
        </h3>
        {loadingHistorical ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : historical.total === 0 ? (
          <p className="text-xs text-muted-foreground">
            No historical data yet. Hit rate events are flushed to the database every 30 seconds.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">
                  {historical.total.toLocaleString()} lookups across {historical.sessionCount} sessions
                </span>
                <span className="font-semibold text-foreground">{historical.localPercent}% local</span>
              </div>
              <HitBar local={historical.local} cache={historical.cache} scryfall={historical.scryfall} total={historical.total} />
              <HitLegend local={historical.local} cache={historical.cache} scryfall={historical.scryfall} />
            </div>
            <OperationBreakdown byOperation={historical.byOperation} />
          </div>
        )}
      </div>
    </div>
  );
}
