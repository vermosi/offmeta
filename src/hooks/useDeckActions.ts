/**
 * Encapsulates deck card mutation handlers with undo/redo support.
 * Extracts action logic from DeckEditor to keep the page component focused on layout.
 * @module hooks/useDeckActions
 */

import { useCallback } from 'react';
import { useDeckCardMutations } from '@/hooks/useDeck';
import type { DeckCard } from '@/hooks/useDeck';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import type { UndoableAction } from '@/hooks/useUndoRedo';
import { supabase } from '@/integrations/supabase/client';
import type { ScryfallCard } from '@/types/card';
import { inferCategory } from '@/lib/deckbuilder/infer-category';

interface UseDeckActionsOpts {
  deckId: string | undefined;
  cards: DeckCard[];
  undoRedo: ReturnType<typeof useUndoRedo>;
}

export function useDeckActions({ deckId, cards, undoRedo }: UseDeckActionsOpts) {
  const { addCard, removeCard, setQuantity, updateCard } = useDeckCardMutations(deckId);

  const handleAddCard = useCallback(async (card: ScryfallCard, opts?: {
    onCacheUpdate?: (card: ScryfallCard) => void;
    onPreview?: (card: ScryfallCard) => void;
  }) => {
    opts?.onCacheUpdate?.(card);
    opts?.onPreview?.(card);
    const typeCategory = inferCategory(card);
    addCard.mutate({ card_name: card.name, category: typeCategory, scryfall_id: card.id });
    undoRedo.push({
      label: `Add ${card.name}`,
      undo: async () => {
        const { data: rows } = await supabase.from('deck_cards').select('id')
          .eq('deck_id', deckId!).eq('card_name', card.name).eq('board', 'mainboard')
          .order('created_at', { ascending: false }).limit(1).single();
        if (rows) removeCard.mutateAsync(rows.id);
      },
      redo: () => addCard.mutateAsync({ card_name: card.name, category: typeCategory, scryfall_id: card.id }),
    });
    return typeCategory;
  }, [addCard, deckId, removeCard, undoRedo]);

  const handleRemoveCard = useCallback((cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (card) {
      removeCard.mutate(cardId);
      undoRedo.push({
        label: `Remove ${card.card_name}`,
        undo: () => addCard.mutateAsync({ card_name: card.card_name, quantity: card.quantity, board: card.board, category: card.category || undefined, is_commander: card.is_commander, is_companion: card.is_companion, scryfall_id: card.scryfall_id || undefined }),
        redo: () => removeCard.mutateAsync(cardId),
      });
    } else {
      removeCard.mutate(cardId);
    }
  }, [removeCard, addCard, cards, undoRedo]);

  const handleSetQuantity = useCallback((cardId: string, qty: number) => {
    const card = cards.find(c => c.id === cardId);
    if (card) {
      const oldQty = card.quantity;
      setQuantity.mutate({ cardId, quantity: qty });
      undoRedo.push({
        label: `${card.card_name} qty ${oldQty}→${qty}`,
        undo: () => setQuantity.mutateAsync({ cardId, quantity: oldQty }),
        redo: () => setQuantity.mutateAsync({ cardId, quantity: qty }),
      });
    } else {
      setQuantity.mutate({ cardId, quantity: qty });
    }
  }, [setQuantity, cards, undoRedo]);

  const handleMoveToSideboard = useCallback((cardId: string, toSideboard: boolean) => {
    const card = cards.find(c => c.id === cardId);
    if (card) {
      const oldBoard = card.board;
      const newBoard = toSideboard ? 'sideboard' : 'mainboard';
      updateCard.mutate({ id: cardId, board: newBoard });
      undoRedo.push({
        label: `Move ${card.card_name} to ${newBoard}`,
        undo: () => updateCard.mutateAsync({ id: cardId, board: oldBoard }),
        redo: () => updateCard.mutateAsync({ id: cardId, board: newBoard }),
      });
    } else {
      updateCard.mutate({ id: cardId, board: toSideboard ? 'sideboard' : 'mainboard' });
    }
  }, [updateCard, cards, undoRedo]);

  const handleMoveToMaybeboard = useCallback((cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (card) {
      const oldBoard = card.board;
      updateCard.mutate({ id: cardId, board: 'maybeboard' });
      undoRedo.push({
        label: `Move ${card.card_name} to maybeboard`,
        undo: () => updateCard.mutateAsync({ id: cardId, board: oldBoard }),
        redo: () => updateCard.mutateAsync({ id: cardId, board: 'maybeboard' }),
      });
    } else {
      updateCard.mutate({ id: cardId, board: 'maybeboard' });
    }
  }, [updateCard, cards, undoRedo]);

  return {
    addCard,
    updateCard,
    removeCard,
    setQuantity,
    handleAddCard,
    handleRemoveCard,
    handleSetQuantity,
    handleMoveToSideboard,
    handleMoveToMaybeboard,
  };
}
