import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('posthog-js', () => {
  const posthog = {
    init: vi.fn(),
    capture: vi.fn(),
    register: vi.fn(),
    setPersonProperties: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    startSessionRecording: vi.fn(),
    stopSessionRecording: vi.fn(),
  };
  return { posthog, default: posthog };
});

vi.mock('../traffic', () => ({
  classifyTraffic: () => ({ isInternal: false, shouldSuppressInsert: false }),
}));

vi.mock('../replay', () => ({
  allowEvent: () => true,
  buildReplayConfig: () => ({}),
  isReplayBlockedPath: () => false,
  shouldRecordSession: () => false,
}));

vi.mock('../config', () => ({
  googleAnalyticsMeasurementId: 'G-TEST123',
  posthogProjectToken: undefined,
  posthogRegion: 'us',
}));

describe('GA4 SPA page views', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    document.head.innerHTML = '';
    window.dataLayer = undefined;
    window.gtag = undefined;
  });

  it('sends an explicit page_view event on route change', async () => {
    const providers = await import('../providers');
    providers.initializeAnalytics({ googleAnalyticsMeasurementId: 'G-TEST123' });

    const gtag = vi.fn();
    window.gtag = gtag;

    providers.trackExternalPageView('/cards/sol-ring');

    const pageViewCalls = gtag.mock.calls.filter(
      (call) => call[0] === 'event' && call[1] === 'page_view',
    );
    expect(pageViewCalls).toHaveLength(1);
    expect(pageViewCalls[0][2]).toMatchObject({
      page_path: '/cards/sol-ring',
      send_to: 'G-TEST123',
    });
  });

  it('does not rely on a repeated config call to emit the page view', async () => {
    const providers = await import('../providers');
    providers.initializeAnalytics({ googleAnalyticsMeasurementId: 'G-TEST123' });

    const gtag = vi.fn();
    window.gtag = gtag;

    providers.trackExternalPageView('/about');

    const configCalls = gtag.mock.calls.filter((call) => call[0] === 'config');
    expect(configCalls).toHaveLength(0);
  });
});
