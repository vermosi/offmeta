import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ScryfallUnavailableError,
  isScryfallCircuitOpen,
  resetScryfallClientState,
  scryfallCircuitRemainingMs,
  scryfallFetch,
} from './scryfall-client.ts';

const URL = 'https://api.scryfall.com/cards/search?q=test';

/** Trips the breaker with the configured number of consecutive failures. */
async function failUntilOpen(times = 4): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await expect(scryfallFetch(URL, { retries: 0, dedupe: false })).rejects.toThrow();
  }
}

describe('scryfallFetch circuit breaker', () => {
  beforeEach(() => {
    resetScryfallClientState();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    resetScryfallClientState();
  });

  it('opens after repeated failures and stops calling Scryfall', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);

    await failUntilOpen();
    expect(isScryfallCircuitOpen()).toBe(true);

    const callsWhenOpen = fetchMock.mock.calls.length;
    await expect(scryfallFetch(URL)).rejects.toBeInstanceOf(
      ScryfallUnavailableError,
    );
    expect(fetchMock.mock.calls.length).toBe(callsWhenOpen);
    expect(scryfallCircuitRemainingMs()).toBeGreaterThan(0);
  });

  it('counts 5xx responses as failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('boom', { status: 500 })),
    );

    for (let i = 0; i < 4; i += 1) {
      const res = await scryfallFetch(URL, { retries: 0, dedupe: false });
      expect(res.status).toBe(500);
    }

    expect(isScryfallCircuitOpen()).toBe(true);
  });

  it('closes again after the cooldown window once a probe succeeds', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);
    await failUntilOpen();

    await vi.advanceTimersByTimeAsync(30_001);
    expect(isScryfallCircuitOpen()).toBe(false);

    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    const response = await scryfallFetch(URL, { retries: 0, dedupe: false });
    expect(response.status).toBe(200);

    // Breaker fully closed: a later failure alone must not re-open it.
    fetchMock.mockRejectedValue(new Error('network down'));
    await expect(scryfallFetch(URL, { retries: 0, dedupe: false })).rejects.toThrow();
    expect(isScryfallCircuitOpen()).toBe(false);
  });

  it('does not trip on ordinary 404 query errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('not found', { status: 404 })),
    );

    for (let i = 0; i < 6; i += 1) {
      const res = await scryfallFetch(URL, { retries: 0, dedupe: false });
      expect(res.status).toBe(404);
    }

    expect(isScryfallCircuitOpen()).toBe(false);
  });
});
