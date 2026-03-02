/**
 * "Add to Deck" section for CardModal.
 * Shows a deck selector dropdown and handles adding the card to a deck.
 * If no decks exist, prompts the user to create one.
 * @module components/CardModal/CardModalAddToDeck
 */

import { useState, useCallback } from 'react';
import { Plus, FolderPlus, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useDecks, useDeckMutations } from '@/hooks/useDeck';
import { toast } from '@/hooks/useToast';
import { useTranslation } from '@/lib/i18n';
import type { ScryfallCard } from '@/types/card';
import { inferCategory } from '@/lib/deckbuilder/infer-category';

interface CardModalAddToDeckProps {
  card: ScryfallCard;
  isMobile?: boolean;
}

export function CardModalAddToDeck({ card, isMobile = false }: CardModalAddToDeckProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: decks = [], isLoading: decksLoading } = useDecks();
  const { createDeck } = useDeckMutations();
  const [addedToDeckId, setAddedToDeckId] = useState<string | null>(null);
  const [addingToDeckId, setAddingToDeckId] = useState<string | null>(null);
  const [creatingDeck, setCreatingDeck] = useState(false);

  const handleAddToDeck = useCallback(async (deckId: string, deckName: string) => {
    setAddingToDeckId(deckId);
    try {
      // Use direct supabase call since useDeckCardMutations needs deckId at hook level
      const { supabase } = await import('@/integrations/supabase/client');
      const category = inferCategory(card);
      const { error } = await supabase.from('deck_cards').upsert(
        {
          deck_id: deckId,
          card_name: card.name,
          quantity: 1,
          board: 'mainboard',
          category,
          is_commander: false,
          is_companion: false,
          scryfall_id: card.id,
        },
        { onConflict: 'deck_id,card_name,board', ignoreDuplicates: false }
      );
      if (error) throw error;
      setAddedToDeckId(deckId);
      toast({
        title: t('card.addedToDeck', 'Added to deck'),
        description: `${card.name} → ${deckName}`,
      });
      // Reset the check after 2s
      setTimeout(() => setAddedToDeckId(null), 2000);
    } catch {
      toast({
        title: t('card.addToDeckFailed', 'Failed to add'),
        description: t('card.addToDeckFailedDesc', 'Could not add card to deck. Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setAddingToDeckId(null);
    }
  }, [card, t]);

  const handleCreateDeckAndAdd = useCallback(async () => {
    setCreatingDeck(true);
    try {
      const newDeck = await createDeck.mutateAsync({ name: `${card.name} Deck` });
      await handleAddToDeck(newDeck.id, newDeck.name);
    } catch {
      toast({
        title: t('card.createDeckFailed', 'Failed to create deck'),
        variant: 'destructive',
      });
    } finally {
      setCreatingDeck(false);
    }
  }, [card.name, createDeck, handleAddToDeck, t]);

  // Not logged in — show sign-in prompt
  if (!user) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t('card.addToDeck', 'Add to Deck')}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t('card.signInToBuild', 'Sign in to start building decks')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {t('card.addToDeck', 'Add to Deck')}
      </h3>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8 w-full justify-start"
            disabled={decksLoading || creatingDeck}
          >
            {creatingDeck ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            {t('card.addToDeckBtn', 'Add to Deck')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={isMobile ? 'center' : 'start'}
          className="w-56 max-h-60 overflow-y-auto"
        >
          {decks.length > 0 ? (
            <>
              {decks.slice(0, 15).map((deck) => (
                <DropdownMenuItem
                  key={deck.id}
                  onClick={() => handleAddToDeck(deck.id, deck.name)}
                  disabled={addingToDeckId === deck.id}
                  className="text-xs gap-2"
                >
                  {addingToDeckId === deck.id ? (
                    <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                  ) : addedToDeckId === deck.id ? (
                    <Check className="h-3 w-3 text-accent shrink-0" />
                  ) : (
                    <Plus className="h-3 w-3 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate flex-1">{deck.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {deck.card_count}
                  </span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem
            onClick={handleCreateDeckAndAdd}
            className="text-xs gap-2 text-primary"
          >
            <FolderPlus className="h-3 w-3 shrink-0" />
            {t('card.newDeck', 'New Deck')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
