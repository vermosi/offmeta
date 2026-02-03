/**
 * Supabase Realtime hook for cache synchronization.
 * Subscribes to query_cache changes to invalidate stale cached translations.
 */

import React, { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

interface CachePayload {
  id: string;
  query_hash: string;
  normalized_query: string;
  scryfall_query: string;
}

/**
 * Subscribes to real-time cache updates from Supabase.
 * When a cached query is updated or deleted, invalidates the local TanStack Query cache.
 */
export function useRealtimeCache(): void {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Create a single channel for cache updates
    const channel = supabase
      .channel('query-cache-updates')
      .on<CachePayload>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'query_cache',
        },
        (payload: RealtimePostgresChangesPayload<CachePayload>) => {
          const record = payload.new as CachePayload | undefined;
          const oldRecord = payload.old as CachePayload | undefined;

          switch (payload.eventType) {
            case 'UPDATE':
            case 'DELETE': {
              // Invalidate the translation cache for this query
              const normalizedQuery =
                record?.normalized_query || oldRecord?.normalized_query;
              if (normalizedQuery) {
                queryClient.invalidateQueries({
                  queryKey: ['translation', normalizedQuery],
                });
              }
              break;
            }
            case 'INSERT': {
              // Optionally prefill the cache with new entries
              if (record?.normalized_query && record?.scryfall_query) {
                queryClient.setQueryData(
                  ['translation', record.normalized_query, null, undefined],
                  {
                    scryfallQuery: record.scryfall_query,
                    source: 'realtime-sync',
                  },
                );
              }
              break;
            }
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [queryClient]);
}

/**
 * Provider component wrapper for realtime cache sync.
 */
export function RealtimeCacheProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  useRealtimeCache();
  return React.createElement(React.Fragment, null, children);
}
