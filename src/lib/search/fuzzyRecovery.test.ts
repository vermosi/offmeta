import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resolveFuzzyCardName, __resetFuzzyCardNameCache } from '@/lib/scryfall/client';
import { extractCardNameCandidate } from '@/lib/search/fallback';

/**
 * Fuzzy recovery flow: extractCardNameCandidate → resolveFuzzyCardName → `!"Canonical"`.
 *
 * These tests exercise the composed pipeline used by useSearch's zero-result
 * recovery step. We mock global fetch so no real Scryfall calls happen.
 */

const originalFetch = globalThis.fetch;

function mockFetchOnce(status: number, body?: unknown) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body ?? {},
  } as unknown as Response);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout'] });
  __resetFuzzyCardNameCache();
});

afterEach(() => {
  vi.useRealTimers();
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

async function runWithTimers<T>(promise: Promise<T>): Promise<T> {
  const result = promise;
  await vi.runAllTimersAsync();
  return result;
}

describe('resolveFuzzyCardName', () => {
  it('returns the canonical name for a fuzzy hit', async () => {
    mockFetchOnce(200, { name: "Atraxa, Praetors' Voice" });

    const result = await runWithTimers(resolveFuzzyCardName('atraxia'));

    expect(result).toBe("Atraxa, Praetors' Voice");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/cards/named?fuzzy=atraxia'),
      expect.anything(),
    );
  });

  it('URL-encodes the fuzzy query parameter', async () => {
    mockFetchOnce(200, { name: 'Jace, the Mind Sculptor' });

    await runWithTimers(resolveFuzzyCardName('jace mind sculptor'));

    const call = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toContain('fuzzy=jace%20mind%20sculptor');
  });

  it('returns null when Scryfall responds 404', async () => {
    mockFetchOnce(404, { object: 'error' });

    const result = await runWithTimers(resolveFuzzyCardName('zzzznotacard'));

    expect(result).toBeNull();
  });

  it('returns null when the response has no name field', async () => {
    mockFetchOnce(200, {});

    const result = await runWithTimers(resolveFuzzyCardName('atraxia'));

    expect(result).toBeNull();
  });

  it('returns null for too-short inputs (no network call)', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    expect(await resolveFuzzyCardName('ab')).toBeNull();
    expect(await resolveFuzzyCardName('')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns null when fetch throws (network error)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network down'));

    const result = await runWithTimers(resolveFuzzyCardName('atraxia'));

    expect(result).toBeNull();
  });
});

describe('fuzzy recovery flow — end-to-end composition', () => {
  /**
   * Mirrors the composition in useSearch:
   *   const candidate = extractCardNameCandidate(originalQuery);
   *   if (candidate) {
   *     const resolved = await resolveFuzzyCardName(candidate);
   *     if (resolved) fuzzyQuery = `!"${resolved}"`;
   *   }
   */
  async function runFuzzyRecovery(
    originalQuery: string,
  ): Promise<{ candidate: string | null; resolved: string | null; fuzzyQuery: string | null }> {
    const candidate = extractCardNameCandidate(originalQuery);
    if (!candidate) return { candidate: null, resolved: null, fuzzyQuery: null };

    const resolved = await resolveFuzzyCardName(candidate);
    const fuzzyQuery = resolved ? `!"${resolved}"` : null;
    return { candidate, resolved, fuzzyQuery };
  }

  it('typo "atraxia" → resolves to Atraxa and retries with canonical query', async () => {
    mockFetchOnce(200, { name: "Atraxa, Praetors' Voice" });

    const { candidate, resolved, fuzzyQuery } = await runWithTimers(
      runFuzzyRecovery('atraxia'),
    );

    expect(candidate).toBe('atraxia');
    expect(resolved).toBe("Atraxa, Praetors' Voice");
    expect(fuzzyQuery).toBe(`!"Atraxa, Praetors' Voice"`);
  });

  it('"cards like eterna witness" → strips wrapper and resolves', async () => {
    mockFetchOnce(200, { name: 'Eternal Witness' });

    const { candidate, resolved, fuzzyQuery } = await runWithTimers(
      runFuzzyRecovery('cards like eterna witness'),
    );

    expect(candidate).toBe('eterna witness');
    expect(resolved).toBe('Eternal Witness');
    expect(fuzzyQuery).toBe('!"Eternal Witness"');
  });

  it('"mana crypt alternatives" → strips trailing wrapper and resolves', async () => {
    mockFetchOnce(200, { name: 'Mana Crypt' });

    const { candidate, fuzzyQuery } = await runWithTimers(
      runFuzzyRecovery('mana crypt alternatives'),
    );

    expect(candidate).toBe('mana crypt');
    expect(fuzzyQuery).toBe('!"Mana Crypt"');
  });

  it('descriptive queries produce no candidate and skip fetch', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    const { candidate, fuzzyQuery } = await runFuzzyRecovery(
      'creatures that produce treasure in commander',
    );

    expect(candidate).toBeNull();
    expect(fuzzyQuery).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fuzzy miss (404) leaves fuzzyQuery null so caller falls back to broaden-and-retry', async () => {
    mockFetchOnce(404);

    const { candidate, resolved, fuzzyQuery } = await runWithTimers(
      runFuzzyRecovery('zzzznotacard'),
    );

    expect(candidate).toBe('zzzznotacard');
    expect(resolved).toBeNull();
    expect(fuzzyQuery).toBeNull();
  });
});
