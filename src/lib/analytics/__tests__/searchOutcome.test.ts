import { describe, it, expect, beforeEach, vi } from 'vitest';

const trackEventDirect = vi.fn();

vi.mock('@/hooks/useAnalytics', () => ({
  trackEventDirect: (...args: unknown[]) => trackEventDirect(...args),
}));

import {
  beginSearchOutcome,
  markSearchDegradation,
  reportSearchOutcome,
  resetSearchOutcomeForTests,
  hasOpenSearchOutcome,
} from '../searchOutcome';

describe('searchOutcome', () => {
  beforeEach(() => {
    trackEventDirect.mockClear();
    resetSearchOutcomeForTests();
  });

  it('emits exactly one outcome per started search', () => {
    beginSearchOutcome('req-1', 'cheap red treasure cards');
    reportSearchOutcome('results', { requestId: 'req-1', resultsCount: 42 });
    reportSearchOutcome('results', { requestId: 'req-1', resultsCount: 42 });

    expect(trackEventDirect).toHaveBeenCalledTimes(1);
    const [type, payload] = trackEventDirect.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(type).toBe('search_outcome');
    expect(payload.outcome).toBe('results');
    expect(payload.results_count).toBe(42);
    expect(payload.request_id).toBe('req-1');
    expect(hasOpenSearchOutcome()).toBe(false);
  });

  it('carries the degradation reason onto the terminal event', () => {
    beginSearchOutcome('req-2', 'mono black sacrifice outlets');
    markSearchDegradation('translate_timeout');
    reportSearchOutcome('results', { requestId: 'req-2', resultsCount: 5 });

    const [, payload] = trackEventDirect.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(payload.degraded_reason).toBe('translate_timeout');
  });

  it('closes a still-open search as superseded when a new one starts', () => {
    beginSearchOutcome('req-3', 'first query');
    beginSearchOutcome('req-4', 'second query');

    expect(trackEventDirect).toHaveBeenCalledTimes(1);
    const [, payload] = trackEventDirect.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(payload.outcome).toBe('superseded');
    expect(payload.request_id).toBe('req-3');
  });

  it('ignores outcomes reported for a stale request id', () => {
    beginSearchOutcome('req-5', 'query');
    reportSearchOutcome('zero_results', { requestId: 'stale' });
    expect(trackEventDirect).not.toHaveBeenCalled();
    expect(hasOpenSearchOutcome()).toBe(true);
  });

  it('does nothing when no search is open', () => {
    reportSearchOutcome('results');
    expect(trackEventDirect).not.toHaveBeenCalled();
  });
});
