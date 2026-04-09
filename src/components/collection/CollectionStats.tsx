/**
 * Collection value stats and set tracking display.
 * @module components/collection/CollectionStats
 */

import { DollarSign, Layers, BarChart3, Loader2 } from 'lucide-react';
import { useCollectionValue, type CollectionValueData } from '@/hooks';
import { ManaSymbol } from '@/components/ManaSymbol';

const RARITY_ORDER = ['mythic', 'rare', 'uncommon', 'common', 'unknown'];
const RARITY_COLORS: Record<string, string> = {
  mythic: 'text-orange-400',
  rare: 'text-yellow-400',
  uncommon: 'text-zinc-300',
  common: 'text-muted-foreground',
  unknown: 'text-muted-foreground',
};

const COLOR_MANA: Record<string, string> = {
  White: 'W',
  Blue: 'U',
  Black: 'B',
  Red: 'R',
  Green: 'G',
};

export function CollectionStats() {
  const { data, isLoading } = useCollectionValue();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Calculating collection value...
      </div>
    );
  }

  if (!data || data.totalValue === 0) return null;

  return (
    <div className="space-y-4">
      {/* Value summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Total Value"
          value={`$${data.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          accent
        />
        <StatCard
          icon={<BarChart3 className="h-4 w-4" />}
          label="Priced Cards"
          value={`${data.cardPrices.size}`}
          subtitle={data.missingPriceCount > 0 ? `${data.missingPriceCount} missing` : undefined}
        />
        <StatCard
          icon={<Layers className="h-4 w-4" />}
          label="Sets"
          value={`${data.setCompletion.length}`}
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Avg Card"
          value={data.cardPrices.size > 0
            ? `$${(data.totalValue / data.cardPrices.size).toFixed(2)}`
            : '$0.00'
          }
        />
      </div>

      {/* Rarity + Color breakdown */}
      <div className="grid gap-3 sm:grid-cols-2">
        <BreakdownCard title="By Rarity" data={data} type="rarity" />
        <BreakdownCard title="By Color" data={data} type="color" />
      </div>

      {/* Set tracking */}
      {data.setCompletion.length > 0 && (
        <div className="rounded-lg border border-border p-3 space-y-2">
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-primary" />
            Sets in Collection
          </h4>
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {data.setCompletion.slice(0, 15).map((s) => (
              <div
                key={s.setCode}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-muted/30 text-xs"
              >
                <span className="text-foreground font-medium truncate">
                  {s.setName}
                </span>
                <span className="text-muted-foreground tabular-nums shrink-0 ml-2">
                  {s.ownedCount} cards
                </span>
              </div>
            ))}
          </div>
          {data.setCompletion.length > 15 && (
            <p className="text-[10px] text-muted-foreground text-center">
              +{data.setCompletion.length - 15} more sets
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtitle,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-lg font-bold tabular-nums ${accent ? 'text-primary' : 'text-foreground'}`}>
        {value}
      </p>
      {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function BreakdownCard({
  title,
  data,
  type,
}: {
  title: string;
  data: CollectionValueData;
  type: 'rarity' | 'color';
}) {
  const breakdown = type === 'rarity' ? data.byRarity : data.byColor;
  const entries = Object.entries(breakdown).sort((a, b) => {
    if (type === 'rarity') {
      return RARITY_ORDER.indexOf(a[0]) - RARITY_ORDER.indexOf(b[0]);
    }
    return b[1].value - a[1].value;
  });

  if (entries.length === 0) return null;

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <h4 className="text-xs font-semibold text-foreground">{title}</h4>
      <div className="space-y-1.5">
        {entries.map(([key, val]) => (
          <div key={key} className="flex items-center gap-2 text-xs">
            {type === 'color' && COLOR_MANA[key] ? (
              <ManaSymbol symbol={COLOR_MANA[key]} size="sm" />
            ) : (
              <span className={`capitalize font-medium ${type === 'rarity' ? RARITY_COLORS[key] || '' : 'text-foreground'}`}>
                {key}
              </span>
            )}
            {type === 'color' && !COLOR_MANA[key] && (
              <span className="text-foreground font-medium">{key}</span>
            )}
            <span className="text-muted-foreground tabular-nums">{val.count} cards</span>
            <span className="ml-auto text-foreground tabular-nums font-medium">
              ${val.value.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
