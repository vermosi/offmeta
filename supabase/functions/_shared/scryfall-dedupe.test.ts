import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  resetScryfallClientState,
  scryfallFetch,
  scryfallSearch,
} from './scryfall-client.ts';

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

describe('scryfallFetch request deduplication', () => {
  beforeEach(() => {
    resetScryfallClientState();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetScryfallClientState();
  });

  it('collapses concurrent identical GETs into one upstream call', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ total_cards: 3 }));
    vi.stubGlobal('fetch', fetchMock);

    const results = await Promise.all([
      scryfallSearch('o:flying'),
      scryfallSearch('o:flying'),
      scryfallSearch('o:flying'),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    for (const response of results) {
      await expect(response.json()).resolves.toEqual({ total_cards: 3 });
    }
  });

  it('treats param order and query whitespace as equivalent', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await Promise.all([
      scryfallFetch('https://api.scryfall.com/cards/search?q=o%3Aflying&unique=cards'),
      scryfallFetch('https://api.scryfall.com/cards/search?unique=cards&q=o%3Aflying'),
      scryfallFetch('https://api.scryfall.com/cards/search?q=%20o%3Aflying%20%20&unique=cards'),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('serves a sequential repeat from the short-lived cache', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ total_cards: 1 }));
    vi.stubGlobal('fetch', fetchMock);

    const first = await scryfallSearch('t:goblin');
    const second = await scryfallSearch('t:goblin');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    await expect(first.json()).resolves.toEqual({ total_cards: 1 });
    await expect(second.json()).resolves.toEqual({ total_cards: 1 });
  });

  it('does not share responses between different queries', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      jsonResponse({ url: String(url) }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const [a, b] = await Promise.all([
      scryfallSearch('t:goblin'),
      scryfallSearch('t:elf'),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await a.json()).not.toEqual(await b.json());
  });

  it('does not cache error responses', async () => {
    const fetchMock = vi.fn(async () => new Response('nope', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    await scryfallSearch('t:notathing', {}, { retries: 0 });
    await scryfallSearch('t:notathing', {}, { retries: 0 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('bypasses dedupe when explicitly disabled', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await scryfallSearch('t:goblin', {}, { dedupe: false });
    await scryfallSearch('t:goblin', {}, { dedupe: false });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
