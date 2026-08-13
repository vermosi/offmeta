/**
 * Control-room data hook.
 *
 * Loads the signals the Operations Inbox ranks against: product metrics,
 * emerging intent clusters, error-monitor state and pipeline freshness.
 * Every call degrades gracefully — a missing signal never blanks the inbox.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/core/logger';
import type { IntentOpportunity } from '@/pages/admin/lib/opportunity';

export interface ProductMetrics {
  window_days: number;
  searches: number;
  search_success_rate: number | null;
  zero_result_searches: number;
  search_to_card_click_rate: number | null;
  search_to_refinement_rate: number | null;
  searches_per_session: number | null;
  returning_searchers: number;
  total_searchers: number;
  returning_searcher_rate: number | null;
  retention_d7: number | null;
  retention_d30: number | null;
  landing_to_search_rate: number | null;
  search_to_external_action_rate: number | null;
}

export interface OpsFreshness {
  stale: string[];
  criticalErrors: number;
}

export function useAdminOpsData(isAdmin: boolean, days: number) {
  const [metrics, setMetrics] = useState<ProductMetrics | null>(null);
  const [opportunities, setOpportunities] = useState<IntentOpportunity[]>([]);
  const [freshness, setFreshness] = useState<OpsFreshness>({ stale: [], criticalErrors: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoading(true);

    const [metricsRes, oppsRes, freshnessRes, errorRes] = await Promise.allSettled([
      supabase.rpc('get_product_metrics' as never, { days_back: days } as never),
      supabase.rpc('get_intent_opportunities' as never, {
        min_searchers: 2,
        max_results: 40,
      } as never),
      supabase.rpc('get_ops_freshness' as never, {} as never),
      supabase.rpc('get_error_monitor_summary' as never, { days_back: days } as never),
    ]);

    if (metricsRes.status === 'fulfilled' && !metricsRes.value.error) {
      setMetrics(metricsRes.value.data as unknown as ProductMetrics);
    } else {
      logger.warn('[admin-ops] product metrics unavailable');
    }

    if (oppsRes.status === 'fulfilled' && !oppsRes.value.error) {
      setOpportunities((oppsRes.value.data ?? []) as unknown as IntentOpportunity[]);
    }

    const stale: string[] = [];
    if (freshnessRes.status === 'fulfilled' && !freshnessRes.value.error) {
      const raw = freshnessRes.value.data as unknown as Record<
        string,
        { stale?: boolean; fresh?: boolean }
      > | null;
      if (raw && typeof raw === 'object') {
        for (const [key, value] of Object.entries(raw)) {
          if (value && typeof value === 'object' && (value.stale === true || value.fresh === false)) {
            stale.push(key);
          }
        }
      }
    }

    let criticalErrors = 0;
    if (errorRes.status === 'fulfilled' && !errorRes.value.error) {
      const raw = errorRes.value.data as unknown as
        | { open_critical?: number; critical?: number; unresolved?: number }
        | null;
      criticalErrors = Number(raw?.open_critical ?? raw?.critical ?? 0) || 0;
    }

    setFreshness({ stale, criticalErrors });
    setIsLoading(false);
  }, [isAdmin, days]);

  useEffect(() => {
    void load();
  }, [load]);

  return { metrics, opportunities, freshness, isLoading, reload: load };
}
