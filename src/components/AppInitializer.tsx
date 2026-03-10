/**
 * Deferred app initialization: prefetching, realtime sync, edge function warmup.
 * Lazy-loaded to keep the main entry bundle lean.
 */

import { useEffect, useRef } from 'react';
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

export default function AppInitializer() {
  usePrefetchPopularQueries();
  useRealtimeCache();
  useEdgeFunctionWarmup();
  return null;
}
