import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface QueryIntelligence {
  normalized_query: string;
  search_quality_score: number;
  confidence: number;
  total_searches: number;
  successful_searches: number;
  result_clicks: number;
  refinements: number;
  no_results: number;
  recoveries: number;
  feedback_reports: number;
  updated_at: string;
}

export function useQueryIntelligence(query: string) {
  const normalized = query.trim().toLowerCase();

  return useQuery({
    queryKey: ['query-intelligence', normalized],
    enabled: normalized.length >= 2,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_query_intelligence', {
        p_query: normalized,
      });
      if (error) throw error;
      const row = (data?.[0] ?? null) as QueryIntelligence | null;
      return row;
    },
  });
}
