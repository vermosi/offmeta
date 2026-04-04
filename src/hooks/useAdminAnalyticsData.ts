import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import type { AnalyticsData } from '@/pages/admin-analytics/types';

export function useAdminAnalyticsData(enabled: boolean) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState('7');
  const initialized = useRef(false);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-analytics?days=${days}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        },
      );

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(errBody || `HTTP ${response.status}`);
      }

      const analyticsData = (await response.json()) as AnalyticsData;
      setData(analyticsData);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'Failed to load analytics',
      );
      toast.error('Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!initialized.current) {
      initialized.current = true;
      void fetchAnalytics();
      return;
    }

    void fetchAnalytics();
  }, [enabled, days, fetchAnalytics]);

  return {
    data,
    isLoading,
    error,
    days,
    setDays,
    fetchAnalytics,
  };
}
