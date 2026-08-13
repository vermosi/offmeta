/**
 * Server-backed search history for signed-in users.
 */

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SearchHistoryEntry {
  id: string;
  rawQuery: string;
  runCount: number;
  lastRunAt: string;
}

export function searchHistoryQueryKey(userId: string | undefined) {
  return ['search-history', userId ?? 'anon'] as const;
}

export function useAccountSearchHistory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: searchHistoryQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: async (): Promise<SearchHistoryEntry[]> => {
      const { data, error } = await supabase
        .from('search_history')
        .select('id, raw_query, run_count, last_run_at')
        .order('last_run_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        rawQuery: row.raw_query,
        runCount: row.run_count,
        lastRunAt: row.last_run_at,
      }));
    },
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: searchHistoryQueryKey(userId) });
  }, [queryClient, userId]);

  const removeEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('search_history').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const clearHistory = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase
        .from('search_history')
        .delete()
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    entries: query.data ?? [],
    isLoading: query.isLoading,
    removeEntry,
    clearHistory,
  };
}
