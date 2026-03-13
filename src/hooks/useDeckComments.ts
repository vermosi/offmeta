/**
 * Hook for deck comments — CRUD with optimistic inserts and realtime updates.
 * @module hooks/useDeckComments
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCallback, useEffect } from 'react';

export interface DeckComment {
  id: string;
  deck_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  profile?: { display_name: string | null; avatar_url: string | null };
}

export function useDeckComments(deckId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['deck-comments', deckId], [deckId]);

  const { data: comments = [], isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<DeckComment[]> => {
      const { data, error } = await supabase
        .from('deck_comments')
        .select('*')
        .eq('deck_id', deckId!)
        .order('created_at', { ascending: true });
      if (error) throw error;

      // Hydrate profiles
      const userIds = [...new Set((data as DeckComment[]).map((c) => c.user_id))];
      if (userIds.length === 0) return data as DeckComment[];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }]),
      );

      return (data as DeckComment[]).map((c) => ({
        ...c,
        profile: profileMap.get(c.user_id) ?? { display_name: null, avatar_url: null },
      }));
    },
    enabled: !!deckId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!deckId) return;
    const channel = supabase
      .channel(`deck-comments-${deckId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'deck_comments',
        filter: `deck_id=eq.${deckId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [deckId, queryClient, queryKey]);

  const addComment = useMutation({
    mutationFn: async (body: string) => {
      if (!user || !deckId) throw new Error('Must be logged in');
      const trimmed = body.trim();
      if (!trimmed || trimmed.length > 2000) throw new Error('Invalid comment');

      const { data, error } = await supabase
        .from('deck_comments')
        .insert({ deck_id: deckId, user_id: user.id, body: trimmed })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('deck_comments')
        .delete()
        .eq('id', commentId);
      if (error) throw error;
    },
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<DeckComment[]>(queryKey);
      queryClient.setQueryData<DeckComment[]>(queryKey, (old) =>
        (old ?? []).filter((c) => c.id !== commentId),
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleAdd = useCallback((body: string) => addComment.mutateAsync(body), [addComment]);
  const handleDelete = useCallback((id: string) => deleteComment.mutate(id), [deleteComment]);

  return {
    comments,
    isLoading,
    addComment: handleAdd,
    deleteComment: handleDelete,
    isAdding: addComment.isPending,
    isAuthenticated: !!user,
    currentUserId: user?.id,
  };
}
