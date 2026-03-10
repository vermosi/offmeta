/**
 * Deferred app initialization: prefetching, realtime sync, edge function warmup.
 * Lazy-loaded to keep the main entry bundle lean.
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePrefetchPopularQueries } from '@/hooks/useSearchQuery';
import { useRealtimeCache } from '@/hooks/useRealtimeCache';
import { supabase } from '@/integrations/supabase/client';

function useEdgeFunctionWarmup() {
  const warmedUp = useRef(false);

  useEffect(() => {
    if (warmedUp.current) return;

    const id = setTimeout(() => {
      if (warmedUp.current) return;
      warmedUp.current = true;

      supabase.functions
        .invoke('semantic-search', {
          body: { query: 'ping warmup', useCache: true },
        })
        .catch(() => {});
    }, 2000);

    return () => clearTimeout(id);
  }, []);
}

/**
 * Prefetch archetype stats so the /archetypes page loads instantly.
 * The materialized view is small and refreshes daily, so we eagerly warm it.
 */
function usePrefetchArchetypes() {
  const queryClient = useQueryClient();
  const prefetched = useRef(false);

  useEffect(() => {
    if (prefetched.current) return;
    prefetched.current = true;

    // Delay slightly to avoid competing with critical first-paint requests
    const id = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey: ['archetype-data-by-format'],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('archetype_stats' as 'community_decks')
            .select('format, macro_archetype, deck_name, archetype, deck_count, meta_percentage, all_colors');

          if (error) throw error;
          return data ?? [];
        },
        staleTime: 30 * 60 * 1000,
      });
    }, 3000);

    return () => clearTimeout(id);
  }, [queryClient]);
}

export default function AppInitializer() {
  usePrefetchPopularQueries();
  useRealtimeCache();
  useEdgeFunctionWarmup();
  usePrefetchArchetypes();
  return null;
}
