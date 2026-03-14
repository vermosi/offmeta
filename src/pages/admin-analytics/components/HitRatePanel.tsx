/**
 * Admin panel showing local DB vs Scryfall API hit rates.
 * Displays how often the local database serves requests
 * vs falling back to the external API.
 * @module pages/admin-analytics/components/HitRatePanel
 */

import { useState, useCallback } from 'react';
import { Database, Globe, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getHitRateStats,
  clearHitRateStats,
  type HitOperation,
} from '@/services/hit-rate-tracker';

const OP_LABELS: Record<HitOperation, string> = {
  card_by_name: 'Card by Name',
  cards_batch: 'Batch Lookup',
  autocomplete: 'Autocomplete',
  random_card: 'Random Card',
  price_lookup: 'Price Lookup',
};

export function HitRatePanel() {
  const [stats, setStats] = useState(() => getHitRateStats());

  const refresh = useCallback(() => setStats(getHitRateStats()), []);
  const clear = useCallback(() => {
    clearHitRateStats();
    setStats(getHitRateStats());
  }, []);

  const barWidth = (value: number, total: number) =>
    total > 0 ? `${Math.max((value / total) * 100, 0.5)}%` : '0%';

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

      {stats.total === 0 ? (
        <p className="text-sm text-muted-foreground">
          No data yet. Browse the app to generate hit rate data.
        </p>
      ) : (
        <div className="space-y-4">
          {/* Summary bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">
                {stats.total.toLocaleString()} total lookups
              </span>
              <span className="font-semibold text-foreground">
                {stats.localPercent}% local
              </span>
            </div>
            <div className="h-3 rounded-full overflow-hidden bg-muted flex">
              {stats.local > 0 && (
                <div
                  className="bg-emerald-500 transition-all"
                  style={{ width: barWidth(stats.local, stats.total) }}
                  title={`Local: ${stats.local}`}
                />
              )}
              {stats.cache > 0 && (
                <div
                  className="bg-sky-500 transition-all"
                  style={{ width: barWidth(stats.cache, stats.total) }}
                  title={`Cache: ${stats.cache}`}
                />
              )}
              {stats.scryfall > 0 && (
                <div
                  className="bg-amber-500 transition-all"
                  style={{ width: barWidth(stats.scryfall, stats.total) }}
                  title={`Scryfall: ${stats.scryfall}`}
                />
              )}
            </div>
            <div className="flex gap-4 mt-1.5 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                Local ({stats.local})
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-sky-500" />
                Cache ({stats.cache})
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                Scryfall ({stats.scryfall})
              </span>
            </div>
          </div>

          {/* Per-operation breakdown */}
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              By Operation
            </h3>
            {(Object.entries(stats.byOperation) as [HitOperation, { local: number; scryfall: number; cache: number }][])
              .filter(([, v]) => v.local + v.scryfall + v.cache > 0)
              .map(([op, v]) => {
                const opTotal = v.local + v.scryfall + v.cache;
                const pct = Math.round((v.local / opTotal) * 100);
                return (
                  <div key={op} className="flex items-center gap-2">
                    <span className="text-xs text-foreground w-28 truncate">
                      {OP_LABELS[op]}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden flex">
                      {v.local > 0 && (
                        <div
                          className="bg-emerald-500"
                          style={{ width: barWidth(v.local, opTotal) }}
                        />
                      )}
                      {v.cache > 0 && (
                        <div
                          className="bg-sky-500"
                          style={{ width: barWidth(v.cache, opTotal) }}
                        />
                      )}
                      {v.scryfall > 0 && (
                        <div
                          className="bg-amber-500"
                          style={{ width: barWidth(v.scryfall, opTotal) }}
                        />
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground w-12 text-right tabular-nums">
                      {pct}% local
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
