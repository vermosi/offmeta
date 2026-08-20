/**
 * In-memory caching for single-card and autocomplete lookups.
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/scryfall/local-cards', () => ({
  localAutocomplete: vi.fn(async () => []),
  getLocalRandomCard: vi.fn(async () => null),
}));

import {
  autocomplete,
  getCardByName,
  __resetCardLookupCaches,
} from '@/lib/scryfall/client';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('card lookup memory cache', () => {
  beforeEach(() => {
    __resetCardLookupCaches();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    __resetCardLookupCaches();
  });

  it('serves repeated getCardByName calls from memory', async () => {
    const card = { id: 'abc', name: 'Cyclonic Rift' };
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(card));

    const first = await getCardByName('Cyclonic Rift');
    const second = await getCardByName('cyclonic rift');

    expect(first).toEqual(card);
    expect(second).toEqual(card);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('dedupes concurrent getCardByName calls for the same card', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ id: 'x', name: 'Sol Ring' }));

    await Promise.all([getCardByName('Sol Ring'), getCardByName('Sol Ring')]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('caches autocomplete suggestions per prefix', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ data: ['Sol Ring', 'Sol Talisman'] }));

    const a = await autocomplete('sol');
    const b = await autocomplete('SOL');

    expect(a).toEqual(['Sol Ring', 'Sol Talisman']);
    expect(b).toEqual(a);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('does not hit the network for queries shorter than 2 characters', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    expect(await autocomplete('s')).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
