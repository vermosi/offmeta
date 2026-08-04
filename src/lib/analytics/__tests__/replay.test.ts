import { beforeEach, describe, expect, it, vi } from 'vitest';

const classifyTraffic = vi.fn(() => ({
  isInternal: false,
  shouldSuppressInsert: false,
}));

vi.mock('@/lib/analytics/traffic', () => ({ classifyTraffic }));

async function load() {
  return import('../replay');
}

describe('session replay sampling', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    classifyTraffic.mockReturnValue({
      isInternal: false,
      shouldSuppressInsert: false,
    });
    sessionStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('samples in when the roll is under the rate and persists the decision', async () => {
    const { shouldRecordSession } = await load();
    vi.spyOn(Math, 'random').mockReturnValue(0.01);
    expect(shouldRecordSession(0.1)).toBe(true);

    // Decision is sticky even if a later roll would fail.
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(shouldRecordSession(0.1)).toBe(true);
  });

  it('samples out most sessions', async () => {
    const { shouldRecordSession } = await load();
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    expect(shouldRecordSession(0.1)).toBe(false);
  });

  it('never records internal or preview traffic', async () => {
    classifyTraffic.mockReturnValue({
      isInternal: true,
      shouldSuppressInsert: true,
    });
    const { shouldRecordSession } = await load();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(shouldRecordSession(1)).toBe(false);
  });

  it('never records sensitive routes', async () => {
    const { shouldRecordSession, isReplayBlockedPath } = await load();
    expect(isReplayBlockedPath('/admin/analytics')).toBe(true);
    expect(isReplayBlockedPath('/reset-password')).toBe(true);
    expect(isReplayBlockedPath('/cards/panharmonicon')).toBe(false);

    window.history.pushState({}, '', '/admin/analytics');
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(shouldRecordSession(1)).toBe(false);
  });

  it('masks all inputs in the replay config', async () => {
    const { buildReplayConfig } = await load();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const config = buildReplayConfig();
    expect(config.disable_session_recording).toBe(false);
    expect(config.session_recording?.maskAllInputs).toBe(true);
    expect(config.session_recording?.maskTextSelector).toContain('input');
  });
});

describe('event rate limiting', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('allows a burst up to capacity then drops', async () => {
    const { allowEvent, resetEventLimiter, getDroppedEventCount, EVENT_BUCKET_CAPACITY } =
      await load();
    const now = 1_000_000;
    resetEventLimiter(now);

    for (let i = 0; i < EVENT_BUCKET_CAPACITY; i += 1) {
      expect(allowEvent(now)).toBe(true);
    }
    expect(allowEvent(now)).toBe(false);
    expect(getDroppedEventCount()).toBe(1);
  });

  it('refills over time', async () => {
    const { allowEvent, resetEventLimiter, EVENT_BUCKET_CAPACITY, EVENT_REFILL_PER_MINUTE } =
      await load();
    const now = 2_000_000;
    resetEventLimiter(now);
    for (let i = 0; i < EVENT_BUCKET_CAPACITY; i += 1) allowEvent(now);
    expect(allowEvent(now)).toBe(false);

    const later = now + 60_000;
    for (let i = 0; i < EVENT_REFILL_PER_MINUTE; i += 1) {
      expect(allowEvent(later)).toBe(true);
    }
    expect(allowEvent(later)).toBe(false);
  });
});
