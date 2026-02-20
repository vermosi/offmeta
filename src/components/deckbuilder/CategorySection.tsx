/**
 * Collapsible category group in the deck list (e.g. "Creatures (14)").
 * Renders card rows with quantity, hover image, set badge, and action controls.
 * @module components/deckbuilder/CategorySection
 */

import { useState } from 'react';
import {
  ChevronDown, ChevronRight, Minus, Plus, Trash2,
  Crown, Shield, ArrowRightLeft, List, Pencil,
} from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CardHoverImage } from '@/components/deckbuilder/CardHoverImage';
import { SetBadge, PrintingPickerPopover } from '@/components/deckbuilder/PrintingPickerPopover';
import { useTranslation } from '@/lib/i18n';
import type { DeckCard } from '@/hooks/useDeck';
import type { ScryfallCard } from '@/types/card';
import type { CardPrinting } from '@/lib/scryfall/printings';

import { CATEGORIES } from './constants';

interface CategorySectionProps {
  category: string;
  cards: DeckCard[];
  onRemove: (id: string) => void;
  onSetQuantity: (cardId: string, qty: number) => void;
  onSetCommander: (cardId: string, isCommander: boolean) => void;
  onSetCompanion: (cardId: string, isCompanion: boolean) => void;
  onSetCategory: (cardId: string, category: string) => void;
  onMoveToSideboard: (cardId: string, toSideboard: boolean) => void;
  onMoveToMaybeboard: (cardId: string) => void;
  isReadOnly: boolean;
  selectedCardId: string | null;
  onSelectCard: (id: string) => void;
  scryfallCache: React.RefObject<Map<string, ScryfallCard>>;
  onChangePrinting: (cardId: string, printing: CardPrinting) => void;
  cacheVersion: number;
}

export function CategorySection({
  category, cards, onRemove, onSetQuantity, onSetCommander, onSetCompanion,
  onSetCategory, onMoveToSideboard, onMoveToMaybeboard, isReadOnly,
  selectedCardId, onSelectCard, scryfallCache, onChangePrinting, cacheVersion,
}: CategorySectionProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const totalQty = cards.reduce((sum, c) => sum + c.quantity, 0);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2 hover:bg-secondary/30 transition-colors rounded-lg text-left">
        {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        <span className="text-xs font-semibold text-foreground">{category}</span>
        <span className="text-[10px] text-muted-foreground">({totalQty})</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="ml-2 border-l border-border/50">
          {cards.map((card) => (
            <li
              key={card.id}
              onClick={() => onSelectCard(card.id)}
              className={cn(
                'flex items-center gap-1 px-2 py-1.5 transition-colors group text-sm cursor-pointer overflow-visible',
                selectedCardId === card.id
                  ? 'bg-accent/10 border-l-2 border-accent -ml-px'
                  : 'hover:bg-secondary/30',
              )}
            >
              <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{card.quantity}×</span>
              <CardHoverImage cardName={card.card_name} scryfallCache={scryfallCache}>
                <span className={cn(
                  'truncate text-xs',
                  card.is_commander && 'font-semibold text-accent',
                  card.is_companion && !card.is_commander && 'font-semibold text-primary',
                )}>
                  {card.card_name}
                </span>
                <SetBadge cardName={card.card_name} scryfallId={card.scryfall_id} scryfallCache={scryfallCache} cacheVersion={cacheVersion} />
              </CardHoverImage>
              {card.is_companion && <span title="Companion"><Shield className="h-3 w-3 text-primary shrink-0" /></span>}
              {card.is_commander && <span title="Commander"><Crown className="h-3 w-3 text-accent shrink-0" /></span>}
              {!isReadOnly && (
                <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <PrintingPickerPopover
                    cardName={card.card_name}
                    currentScryfallId={card.scryfall_id}
                    onSelect={(p) => onChangePrinting(card.id, p)}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors" title={t('deckEditor.changeCategory')}
                        onClick={(e) => e.stopPropagation()}>
                        <Pencil className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 max-h-60 overflow-y-auto">
                      {CATEGORIES.filter((c) => c !== 'Commander').map((cat) => (
                        <DropdownMenuItem key={cat} onClick={() => onSetCategory(card.id, cat)}
                          className={cn('text-xs', card.category === cat && 'text-accent font-medium')}>
                          {cat}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <button onClick={(e) => { e.stopPropagation(); onSetCommander(card.id, !card.is_commander); }}
                    className={cn('p-1 rounded text-muted-foreground hover:text-accent transition-colors', card.is_commander && 'text-accent')}
                    aria-label={t('deckEditor.setAsCommander')} title={t('deckEditor.setAsCommander')}><Crown className="h-3 w-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); onSetCompanion(card.id, !card.is_companion); }}
                    className={cn('p-1 rounded text-muted-foreground hover:text-primary transition-colors', card.is_companion && 'text-primary')}
                    aria-label={t('deckEditor.setAsCompanion')} title={t('deckEditor.setAsCompanion')}><Shield className="h-3 w-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); onMoveToSideboard(card.id, true); }}
                    className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                    title={t('deckEditor.moveToSideboard')}><ArrowRightLeft className="h-3 w-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); onMoveToMaybeboard(card.id); }}
                    className="p-1 rounded text-muted-foreground hover:text-muted-foreground/60 hover:text-foreground transition-colors"
                    title={t('deckEditor.moveToMaybeboard')}><List className="h-3 w-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); onSetQuantity(card.id, card.quantity - 1); }} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                    <Minus className="h-3 w-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); onSetQuantity(card.id, card.quantity + 1); }} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                    <Plus className="h-3 w-3" /></button>
                  <button onClick={(e) => { e.stopPropagation(); onRemove(card.id); }} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                    title={t('deckEditor.removeCard')}>
                    <Trash2 className="h-3 w-3" /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
