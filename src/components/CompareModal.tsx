/**
 * Side-by-side card comparison modal.
 * Compares 2-4 cards across key stats.
 */

import { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ManaCost, OracleText } from '@/components/ManaSymbol';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getCardImage } from '@/lib/scryfall/client';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import type { ScryfallCard } from '@/types/card';

interface CompareModalProps {
  cards: ScryfallCard[];
  open: boolean;
  onClose: () => void;
}

const KEY_FORMATS = ['commander', 'modern', 'standard', 'pioneer', 'pauper'] as const;

function StatRow({
  label,
  values,
  highlight,
}: {
  label: string;
  values: (string | number | null)[];
  highlight?: 'low' | 'high';
}) {
  const numericValues = values.map((v) =>
    typeof v === 'number' ? v : v ? parseFloat(v) : NaN,
  );
  const validNums = numericValues.filter((n) => !isNaN(n));
  const best =
    highlight === 'low'
      ? Math.min(...validNums)
      : highlight === 'high'
        ? Math.max(...validNums)
        : null;

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `8rem repeat(${values.length}, 1fr)` }}>
      <span className="text-xs font-medium text-muted-foreground py-2 flex items-center">
        {label}
      </span>
      {values.map((val, i) => {
        const isBest = best !== null && numericValues[i] === best && validNums.length > 1;
        return (
          <div
            key={i}
            className={`py-2 text-sm text-center ${isBest ? 'font-semibold text-primary' : 'text-foreground'}`}
          >
            {val ?? '—'}
          </div>
        );
      })}
    </div>
  );
}

export function CompareModal({ cards, open, onClose }: CompareModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  useFocusTrap(contentRef, open && cards.length >= 2);

  if (cards.length < 2) return null;

  const colStyle = { gridTemplateColumns: `8rem repeat(${cards.length}, 1fr)` };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>Compare Cards</DialogTitle>
        </DialogHeader>

        <ScrollArea className="px-6 pb-6 max-h-[calc(90vh-4rem)]" ref={contentRef}>
          <div className="space-y-6 pt-4">
            {/* Card images */}
            <div className="grid gap-2" style={colStyle}>
              <div />
              {cards.map((card) => (
                <div key={card.id} className="flex flex-col items-center gap-2">
                  <img
                    src={getCardImage(card, 'normal')}
                    alt={card.name}
                    className="w-full max-w-[160px] rounded-lg shadow-md"
                  />
                  <span className="text-sm font-semibold text-foreground text-center leading-tight">
                    {card.name}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-border" />

            {/* Mana Cost */}
            <div className="grid gap-2" style={colStyle}>
              <span className="text-xs font-medium text-muted-foreground py-2 flex items-center">
                Mana Cost
              </span>
              {cards.map((card) => {
                const cost = card.mana_cost || card.card_faces?.[0]?.mana_cost || '';
                return (
                  <div key={card.id} className="py-2 flex justify-center">
                    {cost ? <ManaCost cost={cost} size="sm" /> : <span className="text-muted-foreground">—</span>}
                  </div>
                );
              })}
            </div>

            {/* Stats */}
            <StatRow
              label="Mana Value"
              values={cards.map((c) => c.cmc)}
              highlight="low"
            />
            <StatRow
              label="Power"
              values={cards.map((c) => c.power || c.card_faces?.[0]?.power || null)}
              highlight="high"
            />
            <StatRow
              label="Toughness"
              values={cards.map((c) => c.toughness || c.card_faces?.[0]?.toughness || null)}
              highlight="high"
            />

            {/* Type line */}
            <div className="grid gap-2" style={colStyle}>
              <span className="text-xs font-medium text-muted-foreground py-2 flex items-center">
                Type
              </span>
              {cards.map((card) => (
                <div key={card.id} className="py-2 text-xs text-foreground text-center">
                  {card.type_line}
                </div>
              ))}
            </div>

            {/* Price */}
            <StatRow
              label="Price (USD)"
              values={cards.map((c) =>
                c.prices?.usd ? `$${c.prices.usd}` : null,
              )}
              highlight="low"
            />

            {/* Rarity */}
            <div className="grid gap-2" style={colStyle}>
              <span className="text-xs font-medium text-muted-foreground py-2 flex items-center">
                Rarity
              </span>
              {cards.map((card) => (
                <div key={card.id} className="py-2 flex justify-center">
                  <Badge variant="secondary" className="capitalize text-xs">
                    {card.rarity}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="border-t border-border" />

            {/* Legalities */}
            <div className="grid gap-2" style={colStyle}>
              <span className="text-xs font-medium text-muted-foreground py-2 flex items-center">
                Legalities
              </span>
              {cards.map((card) => (
                <div key={card.id} className="py-2 flex flex-col items-center gap-1">
                  {KEY_FORMATS.map((fmt) => (
                    <div key={fmt} className="flex items-center gap-1.5 text-[10px]">
                      <div
                        className={`h-1.5 w-1.5 rounded-full ${
                          card.legalities[fmt] === 'legal'
                            ? 'bg-green-500'
                            : card.legalities[fmt] === 'banned'
                              ? 'bg-red-500'
                              : 'bg-muted-foreground/30'
                        }`}
                      />
                      <span className="capitalize text-muted-foreground">{fmt}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="border-t border-border" />

            {/* Oracle text */}
            <div className="grid gap-2" style={colStyle}>
              <span className="text-xs font-medium text-muted-foreground py-2 flex items-start pt-3">
                Card Text
              </span>
              {cards.map((card) => {
                const text = card.oracle_text || card.card_faces?.[0]?.oracle_text || '';
                return (
                  <div key={card.id} className="py-2 text-xs">
                    {text ? (
                      <OracleText text={text} size="sm" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
