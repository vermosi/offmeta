import { beforeEach, describe, expect, it, vi } from 'vitest';

const capture = vi.fn();
const register = vi.fn();
const setPersonProperties = vi.fn();
const identify = vi.fn();
const startSessionRecording = vi.fn();
const stopSessionRecording = vi.fn();

let loadedCallback: (() => void) | undefined;

const init = vi.fn((_token: string, config: { loaded?: () => void }) => {
  loadedCallback = config.loaded;
});

vi.mock('posthog-js', () => {
  const posthog = {
    init,
    capture,
    register,
    setPersonProperties,
    identify,
    startSessionRecording,
    stopSessionRecording,
  };
  return { posthog, default: posthog };
});

vi.mock('../traffic', () => ({
  classifyTraffic: () => ({ isInternal: false, shouldSuppressInsert: false }),
}));

vi.mock('../replay', () => ({
  allowEvent: () => true,
  buildReplayConfig: () => ({}),
  isReplayBlockedPath: (path: string) => path.startsWith('/auth'),
  shouldRecordSession: () => true,
}));

async function loadProviders() {
  return await import('../providers');
}

describe('PostHog cold-load queue', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    loadedCallback = undefined;
  });

  it('queues events fired before init and flushes them once afterwards', async () => {
    const providers = await loadProviders();

    providers.trackExternalEvent('funnel_search', { q: 'ramp' });
    providers.trackExternalEvent('funnel_card_view', { card: 'Sol Ring' });
    expect(capture).not.toHaveBeenCalled();

    providers.initializeAnalytics({ posthogProjectToken: 'phc_test' });
    await Promise.resolve();

    expect(capture).toHaveBeenCalledTimes(2);
    expect(capture.mock.calls[0]).toEqual([
      'funnel_search',
      { q: 'ramp' },
    ]);
    expect(capture.mock.calls[1]).toEqual([
      'funnel_card_view',
      { card: 'Sol Ring' },
    ]);
  });

  it('does not duplicate flushed events when the loaded callback fires later', async () => {
    const providers = await loadProviders();

    providers.trackExternalEvent('funnel_search', { q: 'ramp' });
    providers.initializeAnalytics({ posthogProjectToken: 'phc_test' });
    await Promise.resolve();

    expect(capture).toHaveBeenCalledTimes(1);

    // Remote script resolves after our synchronous flush.
    loadedCallback?.();
    expect(capture).toHaveBeenCalledTimes(1);
  });

  it('preserves ordering across mixed queued call kinds', async () => {
    const providers = await loadProviders();
    const order: string[] = [];
    register.mockImplementation(() => order.push('register'));
    setPersonProperties.mockImplementation(() => order.push('person'));
    capture.mockImplementation(() => order.push('capture'));

    providers.registerExternalSuperProperties({ cohort: '2026-08-03' });
    providers.setExternalPersonProperties({ cohort: '2026-08-03' });
    providers.trackExternalEvent('funnel_search', {});

    providers.initializeAnalytics({ posthogProjectToken: 'phc_test' });
    await Promise.resolve();

    expect(order).toEqual(['register', 'person', 'capture']);
  });

  it('sends post-init navigation events immediately without re-queuing', async () => {
    const providers = await loadProviders();

    providers.initializeAnalytics({ posthogProjectToken: 'phc_test' });
    await Promise.resolve();
    expect(capture).toHaveBeenCalledTimes(0);

    providers.trackExternalEvent('funnel_guide_open', { slug: 'ramp' });
    expect(capture).toHaveBeenCalledTimes(1);

    providers.trackExternalEvent('funnel_combo_save', { id: 'c1' });
    expect(capture).toHaveBeenCalledTimes(2);

    // A later loaded callback must not replay anything.
    loadedCallback?.();
    expect(capture).toHaveBeenCalledTimes(2);
  });

  it('starts from an empty queue after a refresh (fresh module state)', async () => {
    const first = await loadProviders();
    first.trackExternalEvent('funnel_search', {});

    // Simulate a page refresh: module registry is reset, queue is gone.
    vi.resetModules();
    vi.clearAllMocks();
    const second = await loadProviders();

    second.initializeAnalytics({ posthogProjectToken: 'phc_test' });
    await Promise.resolve();

    expect(capture).not.toHaveBeenCalled();
  });

  it('drops nothing below the queue cap and bounds unbounded pre-init bursts', async () => {
    const providers = await loadProviders();

    for (let i = 0; i < 80; i += 1) {
      providers.trackExternalEvent(`burst_${i}`, {});
    }

    providers.initializeAnalytics({ posthogProjectToken: 'phc_test' });
    await Promise.resolve();

    expect(capture).toHaveBeenCalledTimes(50);
    expect(capture.mock.calls[0][0]).toBe('burst_0');
    expect(capture.mock.calls[49][0]).toBe('burst_49');
  });
});

describe('duplicate-send safeguards on re-init', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    loadedCallback = undefined;
  });

  it('only initializes PostHog once across repeated navigation inits', async () => {
    const providers = await loadProviders();

    providers.initializeAnalytics({ posthogProjectToken: 'phc_test' });
    providers.initializeAnalytics({ posthogProjectToken: 'phc_test' });
    providers.initializeAnalytics({ posthogProjectToken: 'phc_test' });
    await Promise.resolve();

    expect(init).toHaveBeenCalledTimes(1);
  });

  it('drops an identical event replayed inside the dedupe window', async () => {
    const providers = await loadProviders();
    providers.initializeAnalytics({ posthogProjectToken: 'phc_test' });
    await Promise.resolve();

    providers.trackExternalEvent('funnel_search', { q: 'ramp' });
    providers.trackExternalEvent('funnel_search', { q: 'ramp' });

    expect(capture).toHaveBeenCalledTimes(1);
  });

  it('still sends distinct events and re-sends after the window elapses', async () => {
    vi.useFakeTimers();
    const providers = await loadProviders();
    providers.initializeAnalytics({ posthogProjectToken: 'phc_test' });
    await Promise.resolve();

    providers.trackExternalEvent('funnel_search', { q: 'ramp' });
    providers.trackExternalEvent('funnel_search', { q: 'draw' });
    expect(capture).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(1000);
    providers.trackExternalEvent('funnel_search', { q: 'ramp' });
    expect(capture).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it('does not double-flush queued events when loaded fires during init', async () => {
    const providers = await loadProviders();
    providers.trackExternalEvent('funnel_search', { q: 'ramp' });

    init.mockImplementationOnce((_t: string, config: { loaded?: () => void }) => {
      loadedCallback = config.loaded;
      config.loaded?.(); // synchronous load, mid-init
    });

    providers.initializeAnalytics({ posthogProjectToken: 'phc_test' });
    await Promise.resolve();

    expect(capture).toHaveBeenCalledTimes(1);
  });
});
