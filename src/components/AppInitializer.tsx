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
  const lastWarmupPath = useRef<string | null>(null);

  useEffect(() => {
    const warmEdgeFunction = () => {
      const currentPath = `${window.location.pathname}${window.location.search}`;
      if (lastWarmupPath.current === currentPath) return;
      lastWarmupPath.current = currentPath;

      void supabase.functions
        .invoke('semantic-search', {
          body: { query: 'ping warmup', useCache: true },
        })
        .catch(() => {});
    };

    const runWarmupOnReady = () => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', warmEdgeFunction, {
          once: true,
        });
        return;
      }

      warmEdgeFunction();
    };

    runWarmupOnReady();

    const onNavigation = () => warmEdgeFunction();

    window.addEventListener('popstate', onNavigation);

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      onNavigation();
    };
    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      onNavigation();
    };

    return () => {
      document.removeEventListener('DOMContentLoaded', warmEdgeFunction);
      window.removeEventListener('popstate', onNavigation);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
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

    const id = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey: ['archetype-data-by-format'],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('archetype_stats' as 'community_decks')
            .select(
              'format, macro_archetype, deck_name, archetype, deck_count, meta_percentage, all_colors',
            );

          if (error) throw error;
          return data ?? [];
        },
        staleTime: 30 * 60 * 1000,
      });
    }, 3000);

    return () => clearTimeout(id);
  }, [queryClient]);
}

/**
 * Prefetch market trend data (price movers) for both daily & weekly views
 * so the /market page loads instantly.
 */
function usePrefetchMarketTrends() {
  const queryClient = useQueryClient();
  const prefetched = useRef(false);

  useEffect(() => {
    if (prefetched.current) return;
    prefetched.current = true;

    const id = setTimeout(() => {
      // Prefetch both daily (1-day) and weekly (7-day) movers in parallel
      for (const daysBack of [1, 7]) {
        queryClient.prefetchQuery({
          queryKey: ['market-trends', daysBack],
          queryFn: async () => {
            const { data, error } = await supabase.rpc('get_price_movers', {
              days_back: daysBack,
              limit_count: 50,
            });
            if (error) throw error;
            return data ?? [];
          },
          staleTime: 30 * 60 * 1000,
        });
      }
    }, 4000); // After archetypes to avoid request contention

    return () => clearTimeout(id);
  }, [queryClient]);
}

/**
 * Prefetch signature cards for the most common formats so archetype detail
 * views render card art instantly. Uses the same queryKey as useSignatureCards.
 */
function usePrefetchSignatureCards() {
  const queryClient = useQueryClient();
  const prefetched = useRef(false);

  useEffect(() => {
    if (prefetched.current) return;
    prefetched.current = true;

    const id = setTimeout(() => {
      for (const format of [
        'commander',
        'modern',
        'standard',
        'pioneer',
        'pauper',
        'premodern',
      ]) {
        queryClient.prefetchQuery({
          queryKey: ['signature-cards', format],
          queryFn: async () => {
            const { data, error } = await supabase.rpc('get_signature_cards', {
              target_format: format,
            });
            if (error) throw error;
            const map = new Map<
              string,
              { deckName: string; cardName: string; imageUrl: string }
            >();
            for (const row of (data ?? []) as Array<{
              deck_name: string;
              card_name: string;
              image_url: string;
            }>) {
              map.set(row.deck_name, {
                deckName: row.deck_name,
                cardName: row.card_name,
                imageUrl: row.image_url,
              });
            }
            return map;
          },
          staleTime: 30 * 60 * 1000,
        });
      }
    }, 5000); // After market trends to stagger requests

    return () => clearTimeout(id);
  }, [queryClient]);
}

export default function AppInitializer() {
  usePrefetchPopularQueries();
  useRealtimeCache();
  useEdgeFunctionWarmup();
  usePrefetchArchetypes();
  usePrefetchMarketTrends();
  usePrefetchSignatureCards();
  return null;
}
