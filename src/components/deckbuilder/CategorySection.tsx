/**
 * Collapsible category group in the deck list (e.g. "Creatures (14) – $123.45").
 * Moxfield-inspired rows with mana cost, price, and context menu dropdown.
 * @module components/deckbuilder/CategorySection
 */

import { useState, useMemo } from 'react';
import {
  ChevronDown, ChevronRight, Minus, Plus, Trash2,
  Crown, Shield, ArrowRightLeft, List, MoreVertical,
} from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CardHoverImage } from '@/components/deckbuilder/CardHoverImage';
import { ManaCost } from '@/components/ManaSymbol';
import { useTranslation } from '@/lib/i18n';
import type { DeckCard } from '@/hooks/useDeck';
import type { ScryfallCard } from '@/types/card';

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
  onChangePrinting: (cardId: string, printing: { id: string }) => void;
  cacheVersion: number;
}

export function CategorySection({
  category, cards, onRemove, onSetQuantity, onSetCommander, onSetCompanion,
  onSetCategory, onMoveToSideboard, onMoveToMaybeboard, isReadOnly,
  selectedCardId, onSelectCard, scryfallCache, cacheVersion,
}: CategorySectionProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const totalQty = cards.reduce((sum, c) => sum + c.quantity, 0);

  // Calculate subtotal price for category
  const categoryPrice = useMemo(() => {
    let total = 0;
    for (const card of cards) {
      const cached = scryfallCache.current?.get(card.card_name);
      const price = cached?.prices?.usd ? parseFloat(cached.prices.usd) : 0;
      total += price * card.quantity;
    }
    return total;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, cacheVersion]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      {/* ── Category Header (Moxfield-style: bold name + count + price) ── */}
      <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-2.5 hover:bg-secondary/30 transition-colors rounded-lg text-left border-b border-border/30">
        {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
        <span className="text-sm font-bold text-foreground">{category}</span>
        <span className="text-xs text-muted-foreground">({totalQty})</span>
        {categoryPrice > 0 && (
          <>
            <span className="text-xs text-muted-foreground">–</span>
            <span className="text-xs text-muted-foreground font-medium">${categoryPrice.toFixed(2)}</span>
          </>
        )}
      </CollapsibleTrigger>

      <CollapsibleContent>
        <ul>
          {cards.map((card) => {
            const cached = scryfallCache.current?.get(card.card_name);
            const manaCost = cached?.mana_cost || cached?.card_faces?.[0]?.mana_cost;
            const price = cached?.prices?.usd;

            return (
              <li
                key={card.id}
                onClick={() => onSelectCard(card.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 transition-colors group text-sm cursor-pointer',
                  selectedCardId === card.id
                    ? 'bg-accent/10 border-l-2 border-accent'
                    : 'hover:bg-secondary/30',
                )}
              >
                {/* Quantity + dot indicator for commander/companion */}
                <span className="flex items-center gap-1 shrink-0 w-6">
                  {(card.is_commander || card.is_companion) && (
                    <span className={cn(
                      'w-1.5 h-1.5 rounded-full shrink-0',
                      card.is_commander ? 'bg-accent' : 'bg-primary',
                    )} />
                  )}
                  <span className="text-xs text-muted-foreground">{card.quantity}</span>
                </span>

                {/* Card name with hover image */}
                <CardHoverImage cardName={card.card_name} scryfallCache={scryfallCache}>
                  <span className={cn(
                    'truncate text-sm',
                    card.is_commander && 'font-semibold text-foreground',
                    card.is_companion && !card.is_commander && 'font-semibold text-foreground',
                  )}>
                    {card.card_name}
                  </span>
                </CardHoverImage>

                {/* Spacer */}
                <span className="flex-1" />

                {/* Mana cost symbols */}
                {manaCost && (
                  <ManaCost cost={manaCost} size="sm" className="shrink-0" />
                )}

                {/* Price */}
                {price && (
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0 font-mono">
                    ${price}
                  </span>
                )}

                {/* Context menu dropdown (replaces inline button cluster) */}
                {!isReadOnly && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors shrink-0 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {/* Quantity controls */}
                      <div className="flex items-center justify-between px-2 py-1.5">
                        <span className="text-xs text-muted-foreground">Quantity</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => onSetQuantity(card.id, card.quantity - 1)}
                            className="p-1 rounded hover:bg-secondary transition-colors">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-medium w-5 text-center">{card.quantity}</span>
                          <button onClick={() => onSetQuantity(card.id, card.quantity + 1)}
                            className="p-1 rounded hover:bg-secondary transition-colors">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <DropdownMenuSeparator />

                      {/* Commander / Companion toggles */}
                      <DropdownMenuItem onClick={() => onSetCommander(card.id, !card.is_commander)}>
                        <Crown className={cn('h-3.5 w-3.5 mr-2', card.is_commander && 'text-accent')} />
                        <span className="text-xs">{card.is_commander ? 'Remove Commander' : 'Set as Commander'}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onSetCompanion(card.id, !card.is_companion)}>
                        <Shield className={cn('h-3.5 w-3.5 mr-2', card.is_companion && 'text-primary')} />
                        <span className="text-xs">{card.is_companion ? 'Remove Companion' : 'Set as Companion'}</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />

                      {/* Move actions */}
                      <DropdownMenuItem onClick={() => onMoveToSideboard(card.id, true)}>
                        <ArrowRightLeft className="h-3.5 w-3.5 mr-2" />
                        <span className="text-xs">{t('deckEditor.moveToSideboard')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onMoveToMaybeboard(card.id)}>
                        <List className="h-3.5 w-3.5 mr-2" />
                        <span className="text-xs">{t('deckEditor.moveToMaybeboard')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />

                      {/* Category submenu */}
                      <div className="px-2 py-1">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Category</span>
                      </div>
                      {CATEGORIES.filter((c) => c !== 'Commander').map((cat) => (
                        <DropdownMenuItem key={cat} onClick={() => onSetCategory(card.id, cat)}
                          className={cn('text-xs pl-4', card.category === cat && 'text-accent font-medium')}>
                          {cat}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />

                      {/* Delete */}
                      <DropdownMenuItem onClick={() => onRemove(card.id)} className="text-destructive focus:text-destructive">
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        <span className="text-xs">{t('deckEditor.removeCard')}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </li>
            );
          })}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
