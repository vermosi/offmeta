/**
 * Hook for deck CRUD operations and card management.
 * @module hooks/useDeck
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCallback } from 'react';

export interface Deck {
  id: string;
  user_id: string;
  name: string;
  format: string;
  commander_name: string | null;
  companion_name: string | null;
  color_identity: string[];
  description: string | null;
  is_public: boolean;
  card_count: number;
  created_at: string;
  updated_at: string;
}

export interface DeckCard {
  id: string;
  deck_id: string;
  card_name: string;
  quantity: number;
  board: string;
  category: string | null;
  is_commander: boolean;
  is_companion: boolean;
  scryfall_id: string | null;
  created_at: string;
}

/** Ensure a session exists (anonymous if needed) for testing without signup. */
export async function ensureSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    await supabase.auth.signInAnonymously();
  }
}

/** Fetch all decks for the current user (including anonymous). */
export function useDecks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['decks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('decks')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as Deck[];
    },
    enabled: !!user, // anonymous sign-in sets user too
  });
}

/** Fetch a single deck by ID. */
export function useDeck(deckId: string | undefined) {
  return useQuery({
    queryKey: ['deck', deckId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('decks')
        .select('*')
        .eq('id', deckId!)
        .single();
      if (error) throw error;
      return data as Deck;
    },
    enabled: !!deckId,
  });
}

/** Fetch all cards in a deck. */
export function useDeckCards(deckId: string | undefined) {
  return useQuery({
    queryKey: ['deck-cards', deckId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deck_cards')
        .select('*')
        .eq('deck_id', deckId!)
        .order('category', { ascending: true })
        .order('card_name', { ascending: true });
      if (error) throw error;
      return data as DeckCard[];
    },
    enabled: !!deckId,
  });
}

/** Mutations for deck management. */
export function useDeckMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const createDeck = useMutation({
    mutationFn: async (opts: { name?: string; format?: string } = {}) => {
      const { data, error } = await supabase
        .from('decks')
        .insert({
          user_id: user!.id,
          name: opts?.name || 'Untitled Deck',
          format: opts?.format || 'commander',
        })
        .select()
        .single();
      if (error) throw error;
      return data as Deck;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['decks'] }),
  });

  const updateDeck = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Deck> & { id: string }) => {
      const { error } = await supabase.from('decks').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['decks'] });
      qc.invalidateQueries({ queryKey: ['deck', vars.id] });
    },
  });

  const deleteDeck = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('decks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['decks'] }),
  });

  return { createDeck, updateDeck, deleteDeck };
}

/** Mutations for card management within a deck. */
export function useDeckCardMutations(deckId: string | undefined) {
  const qc = useQueryClient();

  const addCard = useMutation({
    mutationFn: async (card: {
      card_name: string;
      quantity?: number;
      board?: string;
      category?: string;
      is_commander?: boolean;
      is_companion?: boolean;
      scryfall_id?: string;
    }) => {
      // Check if card already exists in this deck+board
      const { data: existing } = await supabase
        .from('deck_cards')
        .select('id, quantity')
        .eq('deck_id', deckId!)
        .eq('card_name', card.card_name)
        .eq('board', card.board || 'mainboard')
        .single();

      if (existing) {
        // Increment quantity
        const { error } = await supabase
          .from('deck_cards')
          .update({ quantity: existing.quantity + (card.quantity || 1) })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('deck_cards').insert({
          deck_id: deckId!,
          card_name: card.card_name,
          quantity: card.quantity || 1,
          board: card.board || 'mainboard',
          category: card.category || null,
          is_commander: card.is_commander || false,
          is_companion: card.is_companion || false,
          scryfall_id: card.scryfall_id || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deck-cards', deckId] });
      qc.invalidateQueries({ queryKey: ['deck', deckId] });
    },
  });

  const updateCard = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DeckCard> & { id: string }) => {
      const { error } = await supabase.from('deck_cards').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deck-cards', deckId] });
      qc.invalidateQueries({ queryKey: ['deck', deckId] });
    },
  });

  const removeCard = useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase.from('deck_cards').delete().eq('id', cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deck-cards', deckId] });
      qc.invalidateQueries({ queryKey: ['deck', deckId] });
    },
  });

  const setQuantity = useMutation({
    mutationFn: async ({ cardId, quantity }: { cardId: string; quantity: number }) => {
      if (quantity <= 0) {
        const { error } = await supabase.from('deck_cards').delete().eq('id', cardId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('deck_cards')
          .update({ quantity })
          .eq('id', cardId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deck-cards', deckId] });
      qc.invalidateQueries({ queryKey: ['deck', deckId] });
    },
  });

  return { addCard, updateCard, removeCard, setQuantity };
}
