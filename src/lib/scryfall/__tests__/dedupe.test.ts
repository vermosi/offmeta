import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchWithRetry,
  rateLimitedFetch,
  resetScryfallFetchState,
} from '@/lib/scryfall/fetch-utils';

const SEARCH = 'https://api.scryfall.com/cards/search';

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

describe('client Scryfall request deduplication', () => {
  beforeEach(() => {
    resetScryfallFetchState();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetScryfallFetchState();
  });

  it('collapses concurrent identical searches into one request', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ total_cards: 7 }));
    vi.stubGlobal('fetch', fetchMock);

    const responses = await Promise.all([
      rateLimitedFetch(`${SEARCH}?q=o%3Aflying`),
      rateLimitedFetch(`${SEARCH}?q=o%3Aflying`),
      fetchWithRetry(`${SEARCH}?q=o%3Aflying`),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    for (const response of responses) {
      await expect(response.json()).resolves.toEqual({ total_cards: 7 });
    }
  });

  it('normalizes param order and whitespace before deduping', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await rateLimitedFetch(`${SEARCH}?q=t%3Agoblin&unique=cards`);
    await rateLimitedFetch(`${SEARCH}?unique=cards&q=%20t%3Agoblin%20`);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps distinct queries separate and does not cache failures', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      String(url).includes('elf')
        ? new Response('nope', { status: 404 })
        : jsonResponse({ ok: true }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await rateLimitedFetch(`${SEARCH}?q=t%3Agoblin`);
    await fetchWithRetry(`${SEARCH}?q=t%3Aelf`, undefined, 0);
    await fetchWithRetry(`${SEARCH}?q=t%3Aelf`, undefined, 0);

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
