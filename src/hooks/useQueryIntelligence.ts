import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/core/logger';
import { parseQueryIntelligenceRows } from '@/lib/supabase/parsers';

export function useQueryIntelligence(query: string) {
  const normalized = query.trim().toLowerCase();

  return useQuery({
    queryKey: ['query-intelligence', normalized],
    enabled: normalized.length >= 2,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        'get_query_intelligence' as never,
        {
          p_query: normalized,
        } as never,
      );
      if (error) throw error;
      const rows = parseQueryIntelligenceRows(data);
      if ((Array.isArray(data) ? data.length : 0) !== rows.length) {
        logger.error('[useQueryIntelligence] Invalid RPC payload shape', {
          query: normalized,
          payload: data,
        });
      }
      return rows[0] ?? null;
    },
  });
}
