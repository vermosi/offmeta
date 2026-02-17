/**
 * Deck stats bar: mana curve, color pie, card count, avg CMC, price estimate.
 * @module components/deckbuilder/DeckStats
 */

import { useMemo } from 'react';
import type { DeckCard } from '@/hooks/useDeck';
import type { ScryfallCard } from '@/types/card';
import { cn } from '@/lib/core/utils';

// ── Mana Curve ──
const CURVE_LABELS = ['0', '1', '2', '3', '4', '5', '6', '7+'];

function ManaCurve({ distribution }: { distribution: number[] }) {
  const max = Math.max(...distribution, 1);

  return (
    <div className="flex items-end gap-1 h-16">
      {distribution.map((count, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5 flex-1">
          <span className="text-[9px] text-muted-foreground">{count || ''}</span>
          <div
            className="w-full bg-accent/70 rounded-t-sm transition-all min-w-[8px]"
            style={{ height: `${(count / max) * 100}%`, minHeight: count > 0 ? 4 : 0 }}
          />
          <span className="text-[9px] text-muted-foreground">{CURVE_LABELS[i]}</span>
        </div>
      ))}
    </div>
  );
}

// ── Type Distribution ──
const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  Creature: { label: 'Creatures', color: 'bg-green-500' },
  Instant: { label: 'Instants', color: 'bg-blue-400' },
  Sorcery: { label: 'Sorceries', color: 'bg-red-400' },
  Artifact: { label: 'Artifacts', color: 'bg-zinc-400' },
  Enchantment: { label: 'Enchantments', color: 'bg-purple-400' },
  Planeswalker: { label: 'Planeswalkers', color: 'bg-amber-400' },
  Land: { label: 'Lands', color: 'bg-yellow-700' },
  Battle: { label: 'Battles', color: 'bg-orange-400' },
};

function TypeDistribution({ typeCounts }: { typeCounts: Record<string, number> }) {
  const entries = Object.entries(typeCounts).filter(([, v]) => v > 0);
  if (entries.length === 0) return null;
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {entries.map(([t, count]) => {
        const info = TYPE_CONFIG[t] || { label: t, color: 'bg-muted' };
        const pct = Math.round((count / total) * 100);
        return (
          <div key={t} className="flex items-center gap-1" title={`${info.label}: ${count} (${pct}%)`}>
            <div className={cn('h-2.5 w-2.5 rounded-sm', info.color)} />
            <span className="text-[9px] text-muted-foreground">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Color Pie ──
const COLOR_MAP: Record<string, { label: string; color: string }> = {
  W: { label: 'White', color: 'bg-yellow-100 dark:bg-yellow-200' },
  U: { label: 'Blue', color: 'bg-blue-400 dark:bg-blue-500' },
  B: { label: 'Black', color: 'bg-zinc-700 dark:bg-zinc-600' },
  R: { label: 'Red', color: 'bg-red-500 dark:bg-red-600' },
  G: { label: 'Green', color: 'bg-green-500 dark:bg-green-600' },
  C: { label: 'Colorless', color: 'bg-zinc-300 dark:bg-zinc-400' },
};

function ColorPie({ colorCounts }: { colorCounts: Record<string, number> }) {
  const total = Object.values(colorCounts).reduce((a, b) => a + b, 0) || 1;
  const colors = Object.entries(colorCounts).filter(([, v]) => v > 0);

  return (
    <div className="flex items-center gap-1.5">
      {colors.map(([c, count]) => {
        const info = COLOR_MAP[c] || { label: c, color: 'bg-muted' };
        const pct = Math.round((count / total) * 100);
        return (
          <div key={c} className="flex items-center gap-1" title={`${info.label}: ${count} (${pct}%)`}>
            <div className={cn('h-3 w-3 rounded-full', info.color)} />
            <span className="text-[9px] text-muted-foreground">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Stats Container ──
export interface DeckStatsData {
  cards: DeckCard[];
  scryfallCache: Map<string, ScryfallCard>;
  formatMax: number;
}

export function DeckStatsBar({ cards, scryfallCache, formatMax }: DeckStatsData) {
  const stats = useMemo(() => {
    const curve = new Array(8).fill(0);
    const colorCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    let totalCmc = 0;
    let nonLandCount = 0;
    let totalPrice = 0;
    let priceCount = 0;

    for (const dc of cards) {
      const sc = scryfallCache.get(dc.card_name);
      const qty = dc.quantity;

      // CMC distribution (skip lands)
      const isLand = dc.category === 'Lands' || sc?.type_line?.toLowerCase().includes('land');
      if (!isLand) {
        const cmc = sc?.cmc ?? 0;
        const bucket = Math.min(Math.floor(cmc), 7);
        curve[bucket] += qty;
        totalCmc += cmc * qty;
        nonLandCount += qty;
      }

      // Type distribution
      if (sc?.type_line) {
        const tl = sc.type_line.split('—')[0].toLowerCase();
        for (const [key] of Object.entries(TYPE_CONFIG)) {
          if (tl.includes(key.toLowerCase())) {
            typeCounts[key] = (typeCounts[key] || 0) + qty;
          }
        }
      }

      // Colors from color_identity or mana_cost
      if (sc) {
        const colors = sc.color_identity || [];
        for (const c of colors) {
          colorCounts[c] = (colorCounts[c] || 0) + qty;
        }
        if (colors.length === 0 && !isLand) {
          colorCounts['C'] = (colorCounts['C'] || 0) + qty;
        }
      }

      // Price
      if (sc?.prices?.usd) {
        const price = parseFloat(sc.prices.usd);
        if (!isNaN(price)) {
          totalPrice += price * qty;
          priceCount += qty;
        }
      }
    }

    const totalCards = cards.reduce((s, c) => s + c.quantity, 0);
    const avgCmc = nonLandCount > 0 ? (totalCmc / nonLandCount).toFixed(2) : '0.00';

    return { curve, colorCounts, typeCounts, totalCards, avgCmc, totalPrice, priceCount };
  }, [cards, scryfallCache]);

  return (
    <div className="border-t border-border bg-card px-4 py-2.5">
      <div className="flex items-center gap-6 overflow-x-auto">
        {/* Card count */}
        <div className="shrink-0">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Cards</div>
          <div className={cn(
            'text-sm font-semibold',
            stats.totalCards >= formatMax ? 'text-accent' : 'text-foreground',
          )}>
            {stats.totalCards}/{formatMax}
          </div>
        </div>

        {/* Avg CMC */}
        <div className="shrink-0">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg CMC</div>
          <div className="text-sm font-semibold">{stats.avgCmc}</div>
        </div>

        {/* Price */}
        <div className="shrink-0">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Est. Price</div>
          <div className="text-sm font-semibold">
            {stats.priceCount > 0 ? `$${stats.totalPrice.toFixed(2)}` : '—'}
          </div>
        </div>

        {/* Color Pie */}
        <div className="shrink-0">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Colors</div>
          <ColorPie colorCounts={stats.colorCounts} />
        </div>

        {/* Type Distribution */}
        <div className="shrink-0">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Types</div>
          <TypeDistribution typeCounts={stats.typeCounts} />
        </div>

        {/* Mana Curve */}
        <div className="flex-1 min-w-[140px]">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Mana Curve</div>
          <ManaCurve distribution={stats.curve} />
        </div>
      </div>
    </div>
  );
}
