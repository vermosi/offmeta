/**
 * Additional branch coverage tests for scryfall/printings.ts.
 * Targets getTCGPlayerUrl and getCardmarketUrl branches.
 * @module lib/scryfall/__tests__/printings-branches.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getTCGPlayerUrl, getCardmarketUrl } from '../printings';
import type { ScryfallCard } from '@/types/card';

const buildCard = (overrides: Partial<ScryfallCard> = {}): ScryfallCard => ({
  id: 'id',
  name: 'Sol Ring',
  cmc: 1,
  type_line: 'Artifact',
  color_identity: [],
  set: 'cmd',
  set_name: 'Commander',
  rarity: 'uncommon',
  prices: {},
  legalities: {},
  scryfall_uri: 'https://scryfall.com/card/cmd/1',
  ...overrides,
});

describe('getTCGPlayerUrl', () => {
  const savedEnv = { ...import.meta.env };

  beforeEach(() => {
    // Clear affiliate base so tests exercise raw URL logic
    delete (import.meta.env as Record<string, unknown>).NEXT_PUBLIC_TCGPLAYER_IMPACT_BASE;
    if (typeof process !== 'undefined') {
      delete process.env.NEXT_PUBLIC_TCGPLAYER_IMPACT_BASE;
    }
  });

  afterEach(() => {
    // Restore original env
    Object.assign(import.meta.env, savedEnv);
  });

  it('returns purchase_uris.tcgplayer when available', () => {
    const card = buildCard({
      purchase_uris: {
        tcgplayer: 'https://tcgplayer.com/card/sol-ring',
        cardmarket: 'https://cardmarket.com/sol-ring',
      },
    });
    const url = getTCGPlayerUrl(card);
    expect(url).toBe('https://tcgplayer.com/card/sol-ring');
  });

  it('falls back to search URL when no purchase_uris', () => {
    const card = buildCard();
    const url = getTCGPlayerUrl(card);
    expect(url).toContain('tcgplayer.com/search');
    expect(url).toContain(encodeURIComponent('Sol Ring'));
  });

  it('falls back to search URL when purchase_uris has no tcgplayer', () => {
    const card = buildCard({
      purchase_uris: { cardmarket: 'https://cardmarket.com/sol-ring' },
    });
    const url = getTCGPlayerUrl(card);
    expect(url).toContain('tcgplayer.com/search');
  });
});

describe('getCardmarketUrl', () => {
  it('returns purchase_uris.cardmarket when available', () => {
    const card = buildCard({
      purchase_uris: {
        cardmarket: 'https://cardmarket.com/sol-ring',
      },
    });
    expect(getCardmarketUrl(card)).toBe('https://cardmarket.com/sol-ring');
  });

  it('falls back to search URL when no cardmarket URI', () => {
    const card = buildCard();
    const url = getCardmarketUrl(card);
    expect(url).toContain('cardmarket.com');
    expect(url).toContain(encodeURIComponent('Sol Ring'));
  });

  it('falls back when purchase_uris is undefined', () => {
    const card = buildCard({ purchase_uris: undefined });
    const url = getCardmarketUrl(card);
    expect(url).toContain('cardmarket.com');
  });
});
