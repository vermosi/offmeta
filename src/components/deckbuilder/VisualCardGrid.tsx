/**
 * Image-based card grid view for the deck editor.
 * Shows card art with quantity badge and hover controls.
 * @module components/deckbuilder/VisualCardGrid
 */

import { Minus, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import type { DeckCard } from '@/hooks/useDeck';
import type { ScryfallCard } from '@/types/card';

interface VisualCardGridProps {
  cards: DeckCard[];
  scryfallCache: React.RefObject<Map<string, ScryfallCard>>;
  onSelectCard: (id: string) => void;
  selectedCardId: string | null;
  onRemove: (id: string) => void;
  onSetQuantity: (cardId: string, qty: number) => void;
  isReadOnly: boolean;
}

export function VisualCardGrid({
  cards, scryfallCache, onSelectCard, selectedCardId, onRemove, onSetQuantity, isReadOnly,
}: VisualCardGridProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 p-3">
      {cards.map((card) => {
        const sc = scryfallCache.current?.get(card.card_name);
        const imgUrl = sc?.image_uris?.normal ?? sc?.card_faces?.[0]?.image_uris?.normal ?? null;
        return (
          <div
            key={card.id}
            className={cn(
              'relative group cursor-pointer rounded-lg overflow-hidden transition-all duration-150 hover:scale-[1.04] hover:shadow-xl',
              selectedCardId === card.id && 'ring-2 ring-accent scale-[1.04]',
            )}
            onClick={() => onSelectCard(card.id)}
          >
            {imgUrl ? (
              <img
                src={imgUrl}
                alt={card.card_name}
                className="w-full aspect-[2.5/3.5] object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full aspect-[2.5/3.5] bg-secondary shimmer rounded-lg flex items-end p-1">
                <span className="text-[9px] text-muted-foreground leading-tight line-clamp-2 break-words">{card.card_name}</span>
              </div>
            )}
            {card.quantity > 1 && (
              <span className="absolute top-1 left-1 text-[10px] font-bold bg-background/90 text-foreground rounded-full px-1 leading-5 min-w-[18px] text-center shadow">
                {card.quantity}×
              </span>
            )}
            {!isReadOnly && (
              <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                <span className="text-[10px] font-medium text-center line-clamp-2 leading-tight">{card.card_name}</span>
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); onSetQuantity(card.id, card.quantity - 1); }}
                    className="p-1 rounded bg-secondary text-foreground hover:bg-destructive/20 hover:text-destructive transition-colors">
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-xs font-semibold w-4 text-center">{card.quantity}</span>
                  <button onClick={(e) => { e.stopPropagation(); onSetQuantity(card.id, card.quantity + 1); }}
                    className="p-1 rounded bg-secondary text-foreground hover:bg-accent/20 hover:text-accent transition-colors">
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onRemove(card.id); }}
                  className="p-1 rounded bg-secondary text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
