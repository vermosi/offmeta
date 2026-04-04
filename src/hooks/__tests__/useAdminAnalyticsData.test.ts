import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSession = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => getSession(),
    },
  },
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import { useAdminAnalyticsData } from '@/hooks/useAdminAnalyticsData';

describe('useAdminAnalyticsData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'pk_test');
  });

  it('fetches analytics when enabled', async () => {
    getSession.mockResolvedValue({
      data: { session: { access_token: 'token' } },
    });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            summary: {
              totalSearches: 1,
              avgConfidence: 0.5,
              avgResponseTime: 100,
              fallbackRate: 1,
              days: 7,
            },
            sourceBreakdown: {},
            confidenceBuckets: { high: 0, medium: 0, low: 0 },
            dailyVolume: {},
            eventBreakdown: {},
            lowConfidenceQueries: [],
            popularQueries: [],
            responsePercentiles: { p50: 1, p95: 2, p99: 3 },
            deterministicCoverage: {},
          }),
        }),
    );

    const { result } = renderHook(() => useAdminAnalyticsData(true));

    await waitFor(() =>
      expect(result.current.data?.summary.totalSearches).toBe(1),
    );
    expect(result.current.error).toBeNull();
  });

  it('updates days and can refetch manually', async () => {
    getSession.mockResolvedValue({
      data: { session: { access_token: 'token' } },
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          summary: {
            totalSearches: 1,
            avgConfidence: 0.5,
            avgResponseTime: 100,
            fallbackRate: 1,
            days: 7,
          },
          sourceBreakdown: {},
          confidenceBuckets: { high: 0, medium: 0, low: 0 },
          dailyVolume: {},
          eventBreakdown: {},
          lowConfidenceQueries: [],
          popularQueries: [],
          responsePercentiles: { p50: 1, p95: 2, p99: 3 },
          deterministicCoverage: {},
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAdminAnalyticsData(true));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await act(async () => {
      result.current.setDays('30');
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    await act(async () => {
      await result.current.fetchAnalytics();
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
