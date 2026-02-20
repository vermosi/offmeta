/**
 * Collapsible maybeboard card list within the deck editor.
 * @module components/deckbuilder/MaybeboardSection
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, Minus, Plus, Trash2, ChevronUp, ArrowRightLeft } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CardHoverImage } from '@/components/deckbuilder/CardHoverImage';
import { SetBadge, PrintingPickerPopover } from '@/components/deckbuilder/PrintingPickerPopover';
import { useTranslation } from '@/lib/i18n';
import type { DeckCard } from '@/hooks/useDeck';
import type { ScryfallCard } from '@/types/card';
import type { CardPrinting } from '@/lib/scryfall/printings';

interface MaybeboardSectionProps {
  cards: DeckCard[];
  onRemove: (id: string) => void;
  onSetQuantity: (cardId: string, qty: number) => void;
  onMoveToMainboard: (cardId: string) => void;
  onMoveToSideboard: (cardId: string) => void;
  isReadOnly: boolean;
  scryfallCache: React.RefObject<Map<string, ScryfallCard>>;
  onChangePrinting: (cardId: string, printing: CardPrinting) => void;
  cacheVersion: number;
}

export function MaybeboardSection({
  cards, onRemove, onSetQuantity, onMoveToMainboard, onMoveToSideboard,
  isReadOnly, scryfallCache, onChangePrinting, cacheVersion,
}: MaybeboardSectionProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const totalQty = cards.reduce((sum, c) => sum + c.quantity, 0);

  if (cards.length === 0 && isReadOnly) return null;

  return (
    <div className="mt-2 pt-2 border-t border-border/50">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 hover:bg-secondary/30 transition-colors rounded-lg text-left">
          {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className="text-xs font-semibold text-muted-foreground">{t('deckEditor.maybeboard')}</span>
          <span className="text-[10px] text-muted-foreground">({totalQty})</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {cards.length === 0 ? (
            <p className="px-3 py-2 text-[10px] text-muted-foreground">{t('deckEditor.maybeboardEmpty')}</p>
          ) : (
            <ul className="ml-2 border-l border-border/30">
              {cards.map((card) => (
                <li key={card.id} className="flex items-center gap-1 px-2 py-1.5 hover:bg-secondary/30 transition-colors group text-sm overflow-visible">
                  <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{card.quantity}×</span>
                  <CardHoverImage cardName={card.card_name} scryfallCache={scryfallCache}>
                    <span className="truncate text-xs text-muted-foreground">{card.card_name}</span>
                    <SetBadge cardName={card.card_name} scryfallId={card.scryfall_id} scryfallCache={scryfallCache} cacheVersion={cacheVersion} />
                  </CardHoverImage>
                  {!isReadOnly && (
                    <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <PrintingPickerPopover
                        cardName={card.card_name}
                        currentScryfallId={card.scryfall_id}
                        onSelect={(p) => onChangePrinting(card.id, p)}
                      />
                      <button onClick={() => onMoveToMainboard(card.id)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                        title={t('deckEditor.moveToMainboard')}><ChevronUp className="h-3 w-3" /></button>
                      <button onClick={() => onMoveToSideboard(card.id)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                        title={t('deckEditor.moveToSideboard')}><ArrowRightLeft className="h-3 w-3" /></button>
                      <button onClick={() => onSetQuantity(card.id, card.quantity - 1)} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                        <Minus className="h-3 w-3" /></button>
                      <button onClick={() => onSetQuantity(card.id, card.quantity + 1)} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                        <Plus className="h-3 w-3" /></button>
                      <button onClick={() => onRemove(card.id)} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-3 w-3" /></button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
