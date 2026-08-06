/**
 * Additional branch coverage tests for scryfall/printings.ts.
 * Targets getTCGPlayerUrl and getCardmarketUrl branches.
 * @module lib/scryfall/__tests__/printings-branches.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
  it('wraps a direct TCGPlayer URL with the configured affiliate base', () => {
    (import.meta.env as Record<string, unknown>).NEXT_PUBLIC_TCGPLAYER_IMPACT_BASE =
      'https://partner.tcgplayer.com/r/111/222/333?u=';
    const card = buildCard({
      purchase_uris: {
        tcgplayer: 'https://www.tcgplayer.com/product/12345',
      },
    });
    const url = getTCGPlayerUrl(card);
    expect(url).toBe(
      'https://partner.tcgplayer.com/r/111/222/333?u=https%3A%2F%2Fwww.tcgplayer.com%2Fproduct%2F12345',
    );
  });

  it('extracts the destination from a Scryfall partner link and re-wraps with the affiliate base', () => {
    (import.meta.env as Record<string, unknown>).NEXT_PUBLIC_TCGPLAYER_IMPACT_BASE =
      'https://partner.tcgplayer.com/r/111/222/333?u=';
    const scryfallPartner =
      'https://partner.tcgplayer.com/c/4931599/1830156/21018?subId1=api&u=https%3A%2F%2Fwww.tcgplayer.com%2Fproduct%2F696422%3Fpage%3D1';
    const card = buildCard({
      purchase_uris: { tcgplayer: scryfallPartner },
    });
    const url = getTCGPlayerUrl(card);
    expect(url).toBe(
      'https://partner.tcgplayer.com/r/111/222/333?u=https%3A%2F%2Fwww.tcgplayer.com%2Fproduct%2F696422%3Fpage%3D1',
    );
    expect(url).not.toContain('c/4931599');
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
