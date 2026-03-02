/**
 * Hooks for deck tag CRUD and popular tag suggestions.
 * @module hooks/useDeckTags
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DeckTag {
  id: string;
  deck_id: string;
  tag: string;
  created_at: string;
}

/** Fetch tags for a specific deck. */
export function useDeckTags(deckId: string | undefined) {
  return useQuery({
    queryKey: ['deck-tags', deckId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deck_tags')
        .select('*')
        .eq('deck_id', deckId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as DeckTag[];
    },
    enabled: !!deckId,
  });
}

/** Mutations for adding/removing tags with optimistic updates. */
export function useDeckTagMutations(deckId: string | undefined) {
  const qc = useQueryClient();

  const addTag = useMutation({
    mutationFn: async (tag: string) => {
      const normalized = tag.trim().toLowerCase().slice(0, 30);
      if (!normalized) throw new Error('Tag cannot be empty');
      const { error } = await supabase
        .from('deck_tags')
        .insert({ deck_id: deckId!, tag: normalized });
      if (error) throw error;
    },
    onMutate: async (tag) => {
      const normalized = tag.trim().toLowerCase().slice(0, 30);
      await qc.cancelQueries({ queryKey: ['deck-tags', deckId] });
      const prev = qc.getQueryData<DeckTag[]>(['deck-tags', deckId]) ?? [];
      qc.setQueryData<DeckTag[]>(['deck-tags', deckId], [
        ...prev,
        { id: `opt-${Date.now()}`, deck_id: deckId!, tag: normalized, created_at: new Date().toISOString() },
      ]);
      return { prev };
    },
    onError: (_err, _tag, ctx) => {
      if (ctx?.prev) qc.setQueryData(['deck-tags', deckId], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['deck-tags', deckId] }),
  });

  const removeTag = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase.from('deck_tags').delete().eq('id', tagId);
      if (error) throw error;
    },
    onMutate: async (tagId) => {
      await qc.cancelQueries({ queryKey: ['deck-tags', deckId] });
      const prev = qc.getQueryData<DeckTag[]>(['deck-tags', deckId]) ?? [];
      qc.setQueryData<DeckTag[]>(['deck-tags', deckId], prev.filter((t) => t.id !== tagId));
      return { prev };
    },
    onError: (_err, _tagId, ctx) => {
      if (ctx?.prev) qc.setQueryData(['deck-tags', deckId], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['deck-tags', deckId] }),
  });

  return { addTag, removeTag };
}

/** Fetch the most popular tags across all public decks for auto-suggestions. */
export function usePopularTags() {
  return useQuery({
    queryKey: ['popular-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deck_tags')
        .select('tag');
      if (error) throw error;
      // Count occurrences
      const counts: Record<string, number> = {};
      for (const row of data) {
        counts[row.tag] = (counts[row.tag] || 0) + 1;
      }
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([tag]) => tag);
    },
    staleTime: 10 * 60 * 1000,
  });
}
