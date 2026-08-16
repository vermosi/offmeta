import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useResultsEngagement } from '@/hooks/useResultsEngagement';

const trackEvent = vi.fn();

vi.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ trackEvent }),
}));

describe('useResultsEngagement', () => {
  it('emits once when hidden before unmount', () => {
    const container = document.createElement('div');
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      height: 1000,
    } as DOMRect);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');

    const { unmount } = renderHook(() =>
      useResultsEngagement({
        query: 'green ramp',
        resultCount: 10,
        containerRef: { current: container },
      }),
    );

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    unmount();

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith(
      'results_engagement',
      expect.objectContaining({ query: 'green ramp', result_count: 10 }),
    );
  });
});
