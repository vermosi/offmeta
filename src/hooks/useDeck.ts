/**
 * Hook for deck CRUD operations and card management.
 * All card mutations use optimistic updates for instant UI feedback.
 * @module hooks/useDeck
 */

import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

/** Ensure a session exists. Throws if no session is available. */
export async function ensureSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No active session. Please sign in to continue.');
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
          // is_public defaults to true at the DB level — no need to repeat it here
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

// ── Optimistic update helpers ──

/** Snapshot the current deck-cards cache for rollback. */
function snapshotDeckCards(qc: QueryClient, deckId: string) {
  return qc.getQueryData<DeckCard[]>(['deck-cards', deckId]) ?? [];
}

/** Apply an optimistic transform to the deck-cards cache. */
function optimisticSet(qc: QueryClient, deckId: string, updater: (prev: DeckCard[]) => DeckCard[]) {
  qc.setQueryData<DeckCard[]>(['deck-cards', deckId], (old) => updater(old ?? []));
}

/** Rollback to a previous snapshot. */
function rollback(qc: QueryClient, deckId: string, snapshot: DeckCard[]) {
  qc.setQueryData<DeckCard[]>(['deck-cards', deckId], snapshot);
}

/** Invalidate deck-related queries after mutation settles (success or error). */
function settle(qc: QueryClient, deckId: string) {
  qc.invalidateQueries({ queryKey: ['deck-cards', deckId] });
  qc.invalidateQueries({ queryKey: ['deck', deckId] });
}

/** Mutations for card management within a deck — all with optimistic updates. */
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
      const board = card.board || 'mainboard';
      const qty = card.quantity || 1;
      const { error } = await supabase
        .from('deck_cards')
        .upsert(
          {
            deck_id: deckId!,
            card_name: card.card_name,
            quantity: qty,
            board,
            category: card.category || null,
            is_commander: card.is_commander || false,
            is_companion: card.is_companion || false,
            scryfall_id: card.scryfall_id || null,
          },
          { onConflict: 'deck_id,card_name,board', ignoreDuplicates: false },
        );
      if (error) throw error;
    },
    onMutate: async (card) => {
      await qc.cancelQueries({ queryKey: ['deck-cards', deckId] });
      const snapshot = snapshotDeckCards(qc, deckId!);
      const board = card.board || 'mainboard';
      const qty = card.quantity || 1;
      optimisticSet(qc, deckId!, (prev) => {
        // If card already exists on this board, update quantity
        const idx = prev.findIndex((c) => c.card_name === card.card_name && c.board === board);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], quantity: qty };
          return updated;
        }
        // Otherwise add a temporary optimistic entry
        return [...prev, {
          id: `optimistic-${Date.now()}`,
          deck_id: deckId!,
          card_name: card.card_name,
          quantity: qty,
          board,
          category: card.category || null,
          is_commander: card.is_commander || false,
          is_companion: card.is_companion || false,
          scryfall_id: card.scryfall_id || null,
          created_at: new Date().toISOString(),
        }];
      });
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) rollback(qc, deckId!, ctx.snapshot);
    },
    onSettled: () => settle(qc, deckId!),
  });

  const updateCard = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DeckCard> & { id: string }) => {
      const { error } = await supabase.from('deck_cards').update(updates).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, ...updates }) => {
      await qc.cancelQueries({ queryKey: ['deck-cards', deckId] });
      const snapshot = snapshotDeckCards(qc, deckId!);
      optimisticSet(qc, deckId!, (prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      );
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) rollback(qc, deckId!, ctx.snapshot);
    },
    onSettled: () => settle(qc, deckId!),
  });

  const removeCard = useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase.from('deck_cards').delete().eq('id', cardId);
      if (error) throw error;
    },
    onMutate: async (cardId) => {
      await qc.cancelQueries({ queryKey: ['deck-cards', deckId] });
      const snapshot = snapshotDeckCards(qc, deckId!);
      optimisticSet(qc, deckId!, (prev) => prev.filter((c) => c.id !== cardId));
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) rollback(qc, deckId!, ctx.snapshot);
    },
    onSettled: () => settle(qc, deckId!),
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
    onMutate: async ({ cardId, quantity }) => {
      await qc.cancelQueries({ queryKey: ['deck-cards', deckId] });
      const snapshot = snapshotDeckCards(qc, deckId!);
      if (quantity <= 0) {
        optimisticSet(qc, deckId!, (prev) => prev.filter((c) => c.id !== cardId));
      } else {
        optimisticSet(qc, deckId!, (prev) =>
          prev.map((c) => (c.id === cardId ? { ...c, quantity } : c)),
        );
      }
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) rollback(qc, deckId!, ctx.snapshot);
    },
    onSettled: () => settle(qc, deckId!),
  });

  return { addCard, updateCard, removeCard, setQuantity };
}
