/**
 * Hook to fetch archetype deck counts from community_decks.
 * Returns a map of archetype slug → deck count.
 * @module hooks/useArchetypeDeckCounts
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetch deck counts grouped by archetype from community_decks.
 * Returns a Map<string, number> mapping lowercase archetype names to counts.
 */
export function useArchetypeDeckCounts() {
  return useQuery({
    queryKey: ['archetype-deck-counts'],
    queryFn: async (): Promise<Map<string, number>> => {
      // Fetch archetype + count using a grouped query
      // community_decks.archetype stores the archetype name (e.g., "voltron", "Aristocrats")
      const { data, error } = await supabase
        .from('community_decks')
        .select('archetype');

      if (error) throw error;
      if (!data || data.length === 0) return new Map();

      // Count by archetype (case-insensitive)
      const counts = new Map<string, number>();
      for (const row of data) {
        if (!row.archetype) continue;
        const key = row.archetype.toLowerCase().trim();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }

      return counts;
    },
    staleTime: 10 * 60 * 1000, // 10 min
  });
}
