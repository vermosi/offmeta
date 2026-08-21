import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ScryfallUnavailableError,
  fetchWithRetry,
  isScryfallCircuitOpen,
  rateLimitedFetch,
  resetScryfallFetchState,
} from '@/lib/scryfall/fetch-utils';

const URL = 'https://api.scryfall.com/cards/search?q=test';

describe('client Scryfall circuit breaker', () => {
  beforeEach(() => {
    resetScryfallFetchState();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    resetScryfallFetchState();
  });

  it('short-circuits user-facing fetches after repeated failures', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);

    for (let i = 0; i < 4; i += 1) {
      await expect(fetchWithRetry(URL, undefined, 0)).rejects.toThrow();
    }
    expect(isScryfallCircuitOpen()).toBe(true);

    const callsWhenOpen = fetchMock.mock.calls.length;
    await expect(rateLimitedFetch(URL)).rejects.toBeInstanceOf(
      ScryfallUnavailableError,
    );
    expect(fetchMock.mock.calls.length).toBe(callsWhenOpen);
  });

  it('recovers after the cooldown window', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);
    for (let i = 0; i < 4; i += 1) {
      await expect(fetchWithRetry(URL, undefined, 0)).rejects.toThrow();
    }

    await vi.advanceTimersByTimeAsync(30_001);
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));

    const response = await rateLimitedFetch(URL);
    expect(response.status).toBe(200);
    expect(isScryfallCircuitOpen()).toBe(false);
  });
});
