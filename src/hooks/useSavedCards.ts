/**
 * Saved cards — the heart of the account.
 *
 * A card is saved once per user (unique on oracle_id) and linked to any number
 * of collections through `saved_card_collections`.
 */

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';
import { trackFunnelStep } from '@/lib/analytics/funnels';
import type { SavedCardInput } from '@/lib/account';

export interface SavedCard {
  id: string;
  oracleId: string;
  cardName: string;
  scryfallId: string | null;
  imageUrl: string | null;
  manaCost: string | null;
  cmc: number | null;
  typeLine: string | null;
  colors: string[];
  priceUsd: number | null;
  note: string | null;
  createdAt: string;
  collectionIds: string[];
}

interface SavedCardRow {
  id: string;
  oracle_id: string;
  card_name: string;
  scryfall_id: string | null;
  image_url: string | null;
  mana_cost: string | null;
  cmc: number | null;
  type_line: string | null;
  colors: string[] | null;
  price_usd: number | null;
  note: string | null;
  created_at: string;
  saved_card_collections: { collection_id: string }[] | null;
}

const SELECT =
  'id, oracle_id, card_name, scryfall_id, image_url, mana_cost, cmc, type_line, colors, price_usd, note, created_at, saved_card_collections(collection_id)';

function mapRow(row: SavedCardRow): SavedCard {
  return {
    id: row.id,
    oracleId: row.oracle_id,
    cardName: row.card_name,
    scryfallId: row.scryfall_id,
    imageUrl: row.image_url,
    manaCost: row.mana_cost,
    cmc: row.cmc,
    typeLine: row.type_line,
    colors: row.colors ?? [],
    priceUsd: row.price_usd,
    note: row.note,
    createdAt: row.created_at,
    collectionIds: (row.saved_card_collections ?? []).map((l) => l.collection_id),
  };
}

export function savedCardsQueryKey(userId: string | undefined) {
  return ['saved-cards', userId ?? 'anon'] as const;
}

export function useSavedCards() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: savedCardsQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: async (): Promise<SavedCard[]> => {
      const { data, error } = await supabase
        .from('saved_cards')
        .select(SELECT)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => mapRow(row as unknown as SavedCardRow));
    },
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: savedCardsQueryKey(userId) });
  }, [queryClient, userId]);

  const savedOracleIds = useMemo(
    () => new Set((query.data ?? []).map((c) => c.oracleId)),
    [query.data],
  );

  const saveCard = useMutation({
    mutationFn: async (input: {
      card: SavedCardInput;
      collectionIds?: string[];
    }): Promise<SavedCard> => {
      if (!userId) throw new Error('Sign in to save cards.');
      const { card, collectionIds = [] } = input;

      const { data, error } = await supabase
        .from('saved_cards')
        .upsert(
          {
            user_id: userId,
            oracle_id: card.oracleId,
            card_name: card.cardName,
            scryfall_id: card.scryfallId ?? null,
            image_url: card.imageUrl ?? null,
            mana_cost: card.manaCost ?? null,
            cmc: card.cmc ?? null,
            type_line: card.typeLine ?? null,
            colors: card.colors ?? [],
            price_usd: card.priceUsd ?? null,
          },
          { onConflict: 'user_id,oracle_id' },
        )
        .select(SELECT)
        .single();
      if (error) throw error;

      const saved = mapRow(data as unknown as SavedCardRow);

      if (collectionIds.length > 0) {
        const { error: linkError } = await supabase
          .from('saved_card_collections')
          .upsert(
            collectionIds.map((collectionId) => ({
              saved_card_id: saved.id,
              collection_id: collectionId,
              user_id: userId,
            })),
            { onConflict: 'saved_card_id,collection_id' },
          );
        if (linkError) throw linkError;
        saved.collectionIds = Array.from(
          new Set([...saved.collectionIds, ...collectionIds]),
        );
      }

      return saved;
    },
    onSuccess: invalidate,
  });

  const removeCard = useMutation({
    mutationFn: async (oracleId: string) => {
      const { error } = await supabase
        .from('saved_cards')
        .delete()
        .eq('oracle_id', oracleId);
      if (error) throw error;
    },
    onMutate: async (oracleId: string) => {
      const key = savedCardsQueryKey(userId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<SavedCard[]>(key);
      queryClient.setQueryData<SavedCard[]>(key, (old) =>
        (old ?? []).filter((c) => c.oracleId !== oracleId),
      );
      return { previous };
    },
    onError: (_err, _oracleId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(savedCardsQueryKey(userId), context.previous);
      }
    },
    onSettled: invalidate,
  });

  const setCardCollections = useMutation({
    mutationFn: async (input: {
      savedCardId: string;
      collectionIds: string[];
    }) => {
      if (!userId) throw new Error('Sign in to organize cards.');
      const { savedCardId, collectionIds } = input;

      const { error: clearError } = await supabase
        .from('saved_card_collections')
        .delete()
        .eq('saved_card_id', savedCardId);
      if (clearError) throw clearError;

      if (collectionIds.length === 0) return;

      const { error } = await supabase.from('saved_card_collections').insert(
        collectionIds.map((collectionId) => ({
          saved_card_id: savedCardId,
          collection_id: collectionId,
          user_id: userId,
        })),
      );
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const isSaved = useCallback(
    (oracleId: string | undefined) =>
      Boolean(oracleId && savedOracleIds.has(oracleId)),
    [savedOracleIds],
  );

  return {
    savedCards: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    isSaved,
    saveCard,
    removeCard,
    setCardCollections,
  };
}
