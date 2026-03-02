/**
 * Color-column pile view for the deck editor (mainboard only).
 * Buckets cards by color identity, sorted by CMC then name within each pile.
 * @module components/deckbuilder/PileView
 */

import { useMemo } from 'react';
import { cn } from '@/lib/core/utils';
import type { DeckCard } from '@/hooks/useDeck';
import type { ScryfallCard } from '@/types/card';

const PILE_COLORS: { key: string; label: string }[] = [
  { key: 'W', label: 'White' },
  { key: 'U', label: 'Blue' },
  { key: 'B', label: 'Black' },
  { key: 'R', label: 'Red' },
  { key: 'G', label: 'Green' },
  { key: 'M', label: 'Multi' },
  { key: 'C', label: 'Colorless' },
  { key: 'L', label: 'Lands' },
];

const COLOR_BG: Record<string, string> = {
  W: 'bg-yellow-50/10', U: 'bg-blue-950/20', B: 'bg-gray-950/30',
  R: 'bg-red-950/20', G: 'bg-green-950/20', M: 'bg-amber-950/20',
  C: 'bg-secondary/30', L: 'bg-secondary/20',
};

interface PileViewProps {
  /** Must be mainboard cards only — mixing boards produces incorrect color columns. */
  mainboardCards: DeckCard[];
  scryfallCache: React.RefObject<Map<string, ScryfallCard>>;
  onSelectCard: (id: string) => void;
  selectedCardId: string | null;
}

export function PileView({ mainboardCards, scryfallCache, onSelectCard, selectedCardId }: PileViewProps) {
  const piles = useMemo(() => {
    const buckets: Record<string, DeckCard[]> = { W: [], U: [], B: [], R: [], G: [], M: [], C: [], L: [] };
    for (const card of mainboardCards) {
      const sc = scryfallCache.current?.get(card.card_name);
      const typeLine = sc?.type_line?.toLowerCase() ?? card.card_name.toLowerCase();
      if (typeLine.includes('land')) { buckets.L.push(card); continue; }
      const ci = sc?.color_identity ?? [];
      if (ci.length === 0) { buckets.C.push(card); }
      else if (ci.length === 1) { const bucket = buckets[ci[0]]; if (bucket) { bucket.push(card); } else { buckets.C.push(card); } }
      else { buckets.M.push(card); }
    }
    for (const key of Object.keys(buckets)) {
      buckets[key].sort((a, b) => {
        const sa = scryfallCache.current?.get(a.card_name);
        const sb = scryfallCache.current?.get(b.card_name);
        return (sa?.cmc ?? 0) - (sb?.cmc ?? 0) || a.card_name.localeCompare(b.card_name);
      });
    }
    return buckets;
  }, [mainboardCards, scryfallCache]);

  return (
    <div className="flex gap-2 p-3 overflow-x-auto min-h-0 h-full">
      {PILE_COLORS.map(({ key, label }) => {
        const pile = piles[key];
        if (!pile?.length) return null;
        return (
          <div key={key} className={cn('flex-shrink-0 w-32 rounded-lg', COLOR_BG[key])}>
            <div className="px-2 pt-2 pb-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
              <span className="text-[10px] text-muted-foreground ml-1">({pile.reduce((s, c) => s + c.quantity, 0)})</span>
            </div>
            <div className="relative" style={{ height: pile.length * 18 + 60 }}>
              {pile.map((card, i) => {
                const sc = scryfallCache.current?.get(card.card_name);
                const imgUrl = sc?.image_uris?.normal ?? sc?.card_faces?.[0]?.image_uris?.normal ?? null;
                return (
                  <div
                    key={card.id}
                    className={cn(
                      'absolute left-1 right-1 cursor-pointer transition-all duration-100 hover:z-10 hover:-translate-y-0.5',
                      selectedCardId === card.id && 'z-20 -translate-y-1',
                    )}
                    style={{ top: i * 18 }}
                    onClick={() => onSelectCard(card.id)}
                    title={card.card_name}
                  >
                    {imgUrl ? (
                      <img src={imgUrl} alt={card.card_name} className="w-full rounded shadow-sm" loading="lazy" />
                    ) : (
                      <div className="w-full h-10 bg-secondary rounded shadow-sm flex items-center px-1">
                        <span className="text-[8px] text-muted-foreground truncate">{card.card_name}</span>
                      </div>
                    )}
                    {card.quantity > 1 && (
                      <span className="absolute top-0.5 left-0.5 text-[8px] font-bold bg-background/90 text-foreground rounded-full px-1 leading-4 shadow">
                        {card.quantity}×
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
