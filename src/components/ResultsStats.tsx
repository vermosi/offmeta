/**
 * Collapsible stats bar for search results.
 * Shows color distribution, mana curve, and rarity breakdown.
 * The trigger renders inline; expanded content renders via portal-like pattern.
 */

import { useMemo, useState, useCallback } from 'react';
import { ChevronDown, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ManaSymbol } from '@/components/ManaSymbol';
import type { ScryfallCard } from '@/types/card';

interface ResultsStatsProps {
  cards: ScryfallCard[];
}

const COLOR_KEYS = ['W', 'U', 'B', 'R', 'G', 'C'] as const;

const COLOR_MAP: Record<string, { label: string; bg: string; symbol: string }> = {
  W: { label: 'White', bg: 'bg-amber-100 dark:bg-amber-200', symbol: 'W' },
  U: { label: 'Blue', bg: 'bg-blue-400 dark:bg-blue-500', symbol: 'U' },
  B: { label: 'Black', bg: 'bg-zinc-700 dark:bg-zinc-600', symbol: 'B' },
  R: { label: 'Red', bg: 'bg-red-500 dark:bg-red-600', symbol: 'R' },
  G: { label: 'Green', bg: 'bg-green-500 dark:bg-green-600', symbol: 'G' },
  C: { label: 'Colorless', bg: 'bg-muted', symbol: 'C' },
};

const RARITY_MAP: Record<string, { label: string; class: string }> = {
  common: { label: 'C', class: 'text-muted-foreground' },
  uncommon: { label: 'U', class: 'text-slate-400 dark:text-slate-300' },
  rare: { label: 'R', class: 'text-amber-500' },
  mythic: { label: 'M', class: 'text-orange-400' },
};

function computeStats(cards: ScryfallCard[]) {
  const colorCounts: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  const cmcBuckets: Record<number, number> = {};
  const rarityCounts: Record<string, number> = { common: 0, uncommon: 0, rare: 0, mythic: 0 };
  let totalPrice = 0;
  let priceCount = 0;

  for (const card of cards) {
    const colors = card.colors ?? card.color_identity;
    if (colors.length === 0) {
      colorCounts.C++;
    } else {
      for (const c of colors) {
        if (c in colorCounts) colorCounts[c]++;
      }
    }

    const cmc = Math.min(Math.floor(card.cmc || 0), 7);
    cmcBuckets[cmc] = (cmcBuckets[cmc] || 0) + 1;

    if (card.rarity in rarityCounts) {
      rarityCounts[card.rarity]++;
    }

    if (card.prices?.usd) {
      totalPrice += parseFloat(card.prices.usd);
      priceCount++;
    }
  }

  const avgPrice = priceCount > 0 ? totalPrice / priceCount : 0;
  const maxCmcCount = Math.max(1, ...Object.values(cmcBuckets));

  return { colorCounts, cmcBuckets, rarityCounts, avgPrice, maxCmcCount, totalPrice };
}

export function ResultsStats({ cards }: ResultsStatsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const stats = useMemo(() => computeStats(cards), [cards]);
  const toggle = useCallback(() => setIsOpen((o) => !o), []);

  if (cards.length < 2) return null;

  const totalColorHits = Object.values(stats.colorCounts).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="contents">
      {/* Inline trigger button — sits in the toolbar flex row */}
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 py-1 px-2.5 text-[11px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
        aria-expanded={isOpen}
        aria-label="Toggle results statistics"
      >
        <BarChart3 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        <span>Stats</span>
        <ChevronDown
          className={cn(
            'h-3 w-3 transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {/* Expanded panel — breaks out of flex row with full width */}
      {isOpen && (
        <div className="w-full basis-full rounded-xl border border-border/50 bg-muted/20 p-3 sm:p-4 animate-reveal">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {/* Color Distribution */}
            <div className="space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Colors
              </p>
              <div className="flex gap-0.5 h-3 rounded-full overflow-hidden bg-muted">
                {COLOR_KEYS
                  .filter((c) => stats.colorCounts[c] > 0)
                  .map((color) => (
                    <div
                      key={color}
                      className={cn('transition-all', COLOR_MAP[color].bg)}
                      style={{ width: `${(stats.colorCounts[color] / totalColorHits) * 100}%` }}
                      title={`${COLOR_MAP[color].label}: ${stats.colorCounts[color]}`}
                    />
                  ))}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {COLOR_KEYS
                  .filter((c) => stats.colorCounts[c] > 0)
                  .map((color) => (
                    <span key={color} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <ManaSymbol symbol={color} size="sm" className="h-3 w-3" />
                      {stats.colorCounts[color]}
                    </span>
                  ))}
              </div>
            </div>

            {/* Mana Curve */}
            <div className="space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Mana Curve
              </p>
              <div className="flex items-end gap-[3px] h-12">
                {Array.from({ length: 8 }, (_, i) => {
                  const count = stats.cmcBuckets[i] || 0;
                  const heightPct = (count / stats.maxCmcCount) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className="w-full flex items-end h-10">
                        <div
                          className="w-full rounded-t bg-primary/60 transition-all min-h-[2px]"
                          style={{ height: `${Math.max(heightPct, 4)}%` }}
                          title={`${i === 7 ? '7+' : i} CMC: ${count} cards`}
                        />
                      </div>
                      <span className="text-[9px] text-muted-foreground leading-none">
                        {i === 7 ? '7+' : i}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rarity + Price */}
            <div className="space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Rarity & Price
              </p>
              <div className="flex gap-3">
                {Object.entries(stats.rarityCounts)
                  .filter(([, count]) => count > 0)
                  .map(([rarity, count]) => (
                    <div key={rarity} className="text-center">
                      <span className={cn('text-sm font-bold', RARITY_MAP[rarity]?.class)}>
                        {count}
                      </span>
                      <p className="text-[9px] text-muted-foreground">
                        {RARITY_MAP[rarity]?.label}
                      </p>
                    </div>
                  ))}
              </div>
              {stats.avgPrice > 0 && (
                <div className="text-xs text-muted-foreground">
                  Avg ${stats.avgPrice.toFixed(2)} · Total ${stats.totalPrice.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
