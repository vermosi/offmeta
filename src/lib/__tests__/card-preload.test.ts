import { describe, it, expect, beforeEach } from 'vitest';
import { getCardPreload, resetCardPreloadCache } from '@/lib/card-preload';

function mountIsland(json: string) {
  document.body.innerHTML = `<script id="offmeta-card-preload" type="application/json">${json}</script>`;
  resetCardPreloadCache();
}

const VALID = JSON.stringify({
  slug: 'sol-ring',
  name: 'Sol Ring',
  type_line: 'Artifact',
  mana_cost: '{1}',
  oracle_text: '{T}: Add {C}{C}.',
  rarity: 'uncommon',
  image_url: 'https://cards.scryfall.io/normal/sol-ring.jpg',
  price_usd: '1.49',
  price_usd_foil: null,
});

describe('getCardPreload', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    resetCardPreloadCache();
  });

  it('returns the payload when the slug matches', () => {
    mountIsland(VALID);
    const preload = getCardPreload('sol-ring');
    expect(preload?.name).toBe('Sol Ring');
    expect(preload?.price_usd).toBe('1.49');
    expect(preload?.price_usd_foil).toBeNull();
  });

  it('returns null for a different slug (client-side navigation)', () => {
    mountIsland(VALID);
    expect(getCardPreload('lightning-bolt')).toBeNull();
  });

  it('returns null when no island is present', () => {
    expect(getCardPreload('sol-ring')).toBeNull();
  });

  it('returns null on malformed JSON', () => {
    mountIsland('{ not json');
    expect(getCardPreload('sol-ring')).toBeNull();
  });

  it('returns null when required fields are missing or wrong-typed', () => {
    mountIsland(JSON.stringify({ slug: 'sol-ring' }));
    expect(getCardPreload('sol-ring')).toBeNull();

    mountIsland(JSON.stringify({ slug: 'sol-ring', name: 'Sol Ring', price_usd: 1.49 }));
    expect(getCardPreload('sol-ring')).toBeNull();
  });

  it('defaults optional fields to null', () => {
    mountIsland(JSON.stringify({ slug: 'sol-ring', name: 'Sol Ring' }));
    const preload = getCardPreload('sol-ring');
    expect(preload).toMatchObject({ type_line: null, image_url: null, price_usd: null });
  });
});
