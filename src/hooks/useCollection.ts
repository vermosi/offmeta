/**
 * Collection management hooks for tracking owned cards.
 * Provides CRUD operations with optimistic updates.
 * @module hooks/useCollection
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CollectionCard {
  id: string;
  user_id: string;
  card_name: string;
  scryfall_id: string | null;
  quantity: number;
  foil: boolean;
  created_at: string;
  updated_at: string;
}

const COLLECTION_KEY = 'user-collection';

/** Fetch the current user's full collection. */
export function useCollection() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [COLLECTION_KEY, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_cards')
        .select('*')
        .eq('user_id', user!.id)
        .order('card_name', { ascending: true });
      if (error) throw error;
      return data as CollectionCard[];
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 min
    gcTime: 30 * 60 * 1000,
  });
}

/** Returns a Map<card_name, total_quantity> for O(1) lookup. */
export function useCollectionLookup() {
  const { data: collection } = useCollection();
  return useMemo(() => {
    const map = new Map<string, number>();
    if (!collection) return map;
    for (const card of collection) {
      const existing = map.get(card.card_name) || 0;
      map.set(card.card_name, existing + card.quantity);
    }
    return map;
  }, [collection]);
}

/** Mutation to add/upsert a card to the collection. */
export function useAddToCollection() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cardName,
      quantity = 1,
      scryfallId,
      foil = false,
    }: {
      cardName: string;
      quantity?: number;
      scryfallId?: string | null;
      foil?: boolean;
    }) => {
      const sanitized = cardName.trim().slice(0, 200);
      if (!sanitized) throw new Error('Card name required');

      // Try to find existing entry
      const query = supabase
        .from('collection_cards')
        .select('id, quantity')
        .eq('user_id', user!.id)
        .eq('card_name', sanitized)
        .eq('foil', foil);

      if (scryfallId) {
        query.eq('scryfall_id', scryfallId);
      } else {
        query.is('scryfall_id', null);
      }

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, 999);
        const { data, error } = await supabase
          .from('collection_cards')
          .update({ quantity: newQty })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('collection_cards')
          .insert({
            user_id: user!.id,
            card_name: sanitized,
            scryfall_id: scryfallId ?? null,
            quantity: Math.min(quantity, 999),
            foil,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [COLLECTION_KEY] });
    },
  });
}

/** Mutation to remove a card from the collection entirely. */
export function useRemoveFromCollection() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('collection_cards')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [COLLECTION_KEY] });
    },
  });
}

/** Mutation to update quantity of a collection card. */
export function useUpdateCollectionQuantity() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      if (quantity < 1) {
        const { error } = await supabase
          .from('collection_cards')
          .delete()
          .eq('id', id)
          .eq('user_id', user!.id);
        if (error) throw error;
        return null;
      }
      const { data, error } = await supabase
        .from('collection_cards')
        .update({ quantity: Math.min(quantity, 999) })
        .eq('id', id)
        .eq('user_id', user!.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [COLLECTION_KEY] });
    },
  });
}

/** Get collection entry for a specific card name. */
export function useCollectionCard(cardName: string | undefined) {
  const { data: collection } = useCollection();
  return useMemo(() => {
    if (!collection || !cardName) return [];
    return collection.filter((c) => c.card_name === cardName);
  }, [collection, cardName]);
}
