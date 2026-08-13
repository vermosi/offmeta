/**
 * Saved searches — "Save search" from the search desk, re-runnable from /saved.
 */

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';
import { normalizeQueryKey } from '@/lib/account';

export interface SavedSearch {
  id: string;
  naturalQuery: string;
  normalizedQuery: string;
  scryfallQuery: string | null;
  label: string | null;
  resultCount: number | null;
  createdAt: string;
}

interface SavedSearchRow {
  id: string;
  natural_query: string;
  normalized_query: string;
  scryfall_query: string | null;
  label: string | null;
  result_count: number | null;
  created_at: string;
}

const SELECT =
  'id, natural_query, normalized_query, scryfall_query, label, result_count, created_at';

function mapRow(row: SavedSearchRow): SavedSearch {
  return {
    id: row.id,
    naturalQuery: row.natural_query,
    normalizedQuery: row.normalized_query,
    scryfallQuery: row.scryfall_query,
    label: row.label,
    resultCount: row.result_count,
    createdAt: row.created_at,
  };
}

export function savedSearchesQueryKey(userId: string | undefined) {
  return ['saved-searches', userId ?? 'anon'] as const;
}

export function useSavedSearches() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: savedSearchesQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: async (): Promise<SavedSearch[]> => {
      const { data, error } = await supabase
        .from('saved_searches')
        .select(SELECT)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => mapRow(row as SavedSearchRow));
    },
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: savedSearchesQueryKey(userId),
    });
  }, [queryClient, userId]);

  const savedKeys = useMemo(
    () => new Set((query.data ?? []).map((s) => s.normalizedQuery)),
    [query.data],
  );

  const saveSearch = useMutation({
    mutationFn: async (input: {
      naturalQuery: string;
      scryfallQuery?: string | null;
      resultCount?: number | null;
      label?: string | null;
    }) => {
      if (!userId) throw new Error('Sign in to save searches.');
      const naturalQuery = input.naturalQuery.trim().slice(0, 500);
      const { error } = await supabase.from('saved_searches').upsert(
        {
          user_id: userId,
          natural_query: naturalQuery,
          normalized_query: normalizeQueryKey(naturalQuery),
          scryfall_query: input.scryfallQuery ?? null,
          result_count: input.resultCount ?? null,
          label: input.label ?? null,
        },
        { onConflict: 'user_id,normalized_query' },
      );
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const removeSearch = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('saved_searches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const isSearchSaved = useCallback(
    (naturalQuery: string) => savedKeys.has(normalizeQueryKey(naturalQuery)),
    [savedKeys],
  );

  return {
    savedSearches: query.data ?? [],
    isLoading: query.isLoading,
    isSearchSaved,
    saveSearch,
    removeSearch,
  };
}
