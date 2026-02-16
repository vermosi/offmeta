/**
 * Floating bottom bar for card comparison mode.
 * Shows selected card count, thumbnails, and open/clear actions.
 */

import { memo } from 'react';
import { X, GitCompareArrows } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ScryfallCard } from '@/types/card';
import { getCardImage } from '@/lib/scryfall/client';

interface CompareBarProps {
  cards: ScryfallCard[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onCompare: () => void;
}

const MAX_COMPARE = 4;

export const CompareBar = memo(function CompareBar({
  cards,
  onRemove,
  onClear,
  onCompare,
}: CompareBarProps) {
  if (cards.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl border border-border bg-card/95 backdrop-blur-lg shadow-xl animate-reveal max-w-[90vw]">
      {/* Thumbnails */}
      <div className="flex items-center gap-1.5">
        {cards.map((card) => (
          <div key={card.id} className="relative group">
            <img
              src={getCardImage(card, 'small')}
              alt={card.name}
              className="h-14 w-10 rounded-md object-cover border border-border/50"
            />
            <button
              onClick={() => onRemove(card.id)}
              className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 transition-opacity"
              aria-label={`Remove ${card.name}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}
        {/* Empty slots */}
        {Array.from({ length: MAX_COMPARE - cards.length }, (_, i) => (
          <div
            key={`empty-${i}`}
            className="h-14 w-10 rounded-md border-2 border-dashed border-border/30"
          />
        ))}
      </div>

      <div className="flex flex-col items-start gap-0.5">
        <span className="text-xs font-medium text-foreground">
          {cards.length}/{MAX_COMPARE}
        </span>
        <span className="text-[10px] text-muted-foreground">selected</span>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="accent"
          onClick={onCompare}
          disabled={cards.length < 2}
          className="gap-1.5 h-9"
        >
          <GitCompareArrows className="h-3.5 w-3.5" />
          Compare
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClear}
          className="h-9 px-2 text-muted-foreground"
        >
          Clear
        </Button>
      </div>
    </div>
  );
});
