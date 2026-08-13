/**
 * Collections — the user's named lists ("Nekusar Upgrades", "Cards to Buy").
 *
 * A collection can later be promoted to a deck (kind/format/commander are
 * already part of the record), so nothing here has to be rebuilt for that.
 */

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  kind: 'collection' | 'deck';
  format: string | null;
  commanderName: string | null;
  isDefault: boolean;
  createdAt: string;
}

export const DEFAULT_COLLECTION_NAME = 'Unsorted';

interface CollectionRow {
  id: string;
  name: string;
  description: string | null;
  kind: string;
  format: string | null;
  commander_name: string | null;
  is_default: boolean;
  created_at: string;
}

function mapRow(row: CollectionRow): Collection {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    kind: row.kind === 'deck' ? 'deck' : 'collection',
    format: row.format,
    commanderName: row.commander_name,
    isDefault: row.is_default,
    createdAt: row.created_at,
  };
}

export function collectionsQueryKey(userId: string | undefined) {
  return ['collections', userId ?? 'anon'] as const;
}

export function useCollections() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { trackEvent } = useAnalytics();
  const userId = user?.id;

  const query = useQuery({
    queryKey: collectionsQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: async (): Promise<Collection[]> => {
      const { data, error } = await supabase
        .from('collections')
        .select(
          'id, name, description, kind, format, commander_name, is_default, created_at',
        )
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => mapRow(row as CollectionRow));
    },
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: collectionsQueryKey(userId) });
  }, [queryClient, userId]);

  const createCollection = useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string | null;
      isDefault?: boolean;
    }): Promise<Collection> => {
      if (!userId) throw new Error('Sign in to create a collection.');
      const { data, error } = await supabase
        .from('collections')
        .insert({
          user_id: userId,
          name: input.name.trim().slice(0, 80),
          description: input.description?.trim() || null,
          is_default: input.isDefault ?? false,
        })
        .select(
          'id, name, description, kind, format, commander_name, is_default, created_at',
        )
        .single();
      if (error) throw error;
      return mapRow(data as CollectionRow);
    },
    onSuccess: invalidate,
  });

  const renameCollection = useMutation({
    mutationFn: async (input: { id: string; name: string }) => {
      const { error } = await supabase
        .from('collections')
        .update({ name: input.name.trim().slice(0, 80) })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteCollection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('collections').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ['saved-cards'] });
    },
  });

  /** Returns the default "Unsorted" collection, creating it on first use. */
  const ensureDefaultCollection = useCallback(async (): Promise<Collection> => {
    if (!userId) throw new Error('Sign in to save cards.');
    const existing = (query.data ?? []).find((c) => c.isDefault);
    if (existing) return existing;

    const { data, error } = await supabase
      .from('collections')
      .select(
        'id, name, description, kind, format, commander_name, is_default, created_at',
      )
      .eq('is_default', true)
      .maybeSingle();
    if (error) throw error;
    if (data) return mapRow(data as CollectionRow);

    return createCollection.mutateAsync({
      name: DEFAULT_COLLECTION_NAME,
      isDefault: true,
    });
  }, [createCollection, query.data, userId]);

  return {
    collections: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createCollection,
    renameCollection,
    deleteCollection,
    ensureDefaultCollection,
  };
}
