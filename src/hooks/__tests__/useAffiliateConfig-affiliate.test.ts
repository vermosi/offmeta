/**
 * Affiliate URL extraction tests.
 * @module hooks/__tests__/useAffiliateConfig-affiliate
 */

import { describe, it, expect } from 'vitest';
import {
  extractTcgplayerDestinationUrl,
  wrapAffiliateUrl,
} from '../useAffiliateConfig';

describe('extractTcgplayerDestinationUrl', () => {
  it('extracts the `u` query parameter from a partner.tcgplayer.com link', () => {
    const url =
      'https://partner.tcgplayer.com/c/4931599/1830156/21018?subId1=api&u=https%3A%2F%2Fwww.tcgplayer.com%2Fproduct%2F696422%3Fpage%3D1';
    expect(extractTcgplayerDestinationUrl(url)).toBe(
      'https://www.tcgplayer.com/product/696422?page=1',
    );
  });

  it('returns the original URL for non-partner links', () => {
    const url = 'https://www.tcgplayer.com/product/696422?page=1';
    expect(extractTcgplayerDestinationUrl(url)).toBe(url);
  });

  it('returns the original URL for malformed inputs', () => {
    expect(extractTcgplayerDestinationUrl('not-a-url')).toBe('not-a-url');
  });
});

describe('wrapAffiliateUrl', () => {
  const base = 'https://partner.tcgplayer.com/r/111/222/333?u=';

  it('wraps a direct TCGPlayer URL with the affiliate base', () => {
    const url = 'https://www.tcgplayer.com/product/12345';
    expect(wrapAffiliateUrl(url, base)).toBe(
      'https://partner.tcgplayer.com/r/111/222/333?u=https%3A%2F%2Fwww.tcgplayer.com%2Fproduct%2F12345',
    );
  });

  it('extracts the destination from a Scryfall partner link before wrapping', () => {
    const url =
      'https://partner.tcgplayer.com/c/4931599/1830156/21018?subId1=api&u=https%3A%2F%2Fwww.tcgplayer.com%2Fproduct%2F696422%3Fpage%3D1';
    expect(wrapAffiliateUrl(url, base)).toBe(
      'https://partner.tcgplayer.com/r/111/222/333?u=https%3A%2F%2Fwww.tcgplayer.com%2Fproduct%2F696422%3Fpage%3D1',
    );
  });

  it('returns the original URL when no affiliate base is configured', () => {
    const url = 'https://www.tcgplayer.com/product/12345';
    expect(wrapAffiliateUrl(url, '')).toBe(url);
  });
});
