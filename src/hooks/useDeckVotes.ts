/**
 * Hook for deck voting — toggle upvote, count, and check user vote status.
 * Uses optimistic updates for instant feedback.
 * @module hooks/useDeckVotes
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCallback } from 'react';

interface VoteState {
  count: number;
  hasVoted: boolean;
}

export function useDeckVotes(deckId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['deck-votes', deckId];

  const { data = { count: 0, hasVoted: false }, isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<VoteState> => {
      // Fetch count via RPC (no user_id exposure)
      const { data: voteCount, error } = await supabase
        .rpc('get_deck_vote_count', { target_deck_id: deckId! });
      if (error) throw error;

      // Check if user voted (uses RLS — only sees own votes)
      let hasVoted = false;
      if (user) {
        const { data: vote } = await supabase
          .from('deck_votes')
          .select('id')
          .eq('deck_id', deckId!)
          .eq('user_id', user.id)
          .maybeSingle();
        hasVoted = !!vote;
      }

      return { count: voteCount ?? 0, hasVoted };
    },
    enabled: !!deckId,
  });

  const toggleVote = useMutation({
    mutationFn: async () => {
      if (!user || !deckId) throw new Error('Must be logged in');

      if (data.hasVoted) {
        const { error } = await supabase
          .from('deck_votes')
          .delete()
          .eq('deck_id', deckId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('deck_votes')
          .insert({ deck_id: deckId, user_id: user.id });
        if (error) throw error;
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<VoteState>(queryKey);
      queryClient.setQueryData<VoteState>(queryKey, (old) => ({
        count: (old?.count ?? 0) + (old?.hasVoted ? -1 : 1),
        hasVoted: !old?.hasVoted,
      }));
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(queryKey, context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleToggle = useCallback(() => {
    if (!user) return;
    toggleVote.mutate();
  }, [user, toggleVote]);

  return {
    voteCount: data.count,
    hasVoted: data.hasVoted,
    toggleVote: handleToggle,
    isLoading,
    isAuthenticated: !!user,
  };
}
