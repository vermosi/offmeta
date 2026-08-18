/**
 * Build-time card payload embedded in prerendered /cards/<slug> documents by
 * scripts/prerender-cards.mjs. It lets the card page paint its hero (art, name,
 * type line, oracle text, price) on first frame instead of showing skeletons
 * for the length of the Scryfall round-trip.
 * @module lib/card-preload
 */

export interface CardPreload {
  slug: string;
  name: string;
  type_line: string | null;
  mana_cost: string | null;
  oracle_text: string | null;
  rarity: string | null;
  image_url: string | null;
  price_usd: string | null;
  price_usd_foil: string | null;
}

const ELEMENT_ID = 'offmeta-card-preload';

let cached: CardPreload | null | undefined;

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function parse(raw: string): CardPreload | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  if (typeof record.slug !== 'string' || typeof record.name !== 'string') return null;

  const optional = [
    'type_line',
    'mana_cost',
    'oracle_text',
    'rarity',
    'image_url',
    'price_usd',
    'price_usd_foil',
  ] as const;
  for (const key of optional) {
    if (record[key] !== undefined && !isNullableString(record[key])) return null;
  }

  return {
    slug: record.slug,
    name: record.name,
    type_line: (record.type_line as string | null) ?? null,
    mana_cost: (record.mana_cost as string | null) ?? null,
    oracle_text: (record.oracle_text as string | null) ?? null,
    rarity: (record.rarity as string | null) ?? null,
    image_url: (record.image_url as string | null) ?? null,
    price_usd: (record.price_usd as string | null) ?? null,
    price_usd_foil: (record.price_usd_foil as string | null) ?? null,
  };
}

/**
 * Returns the embedded payload when it matches `slug`, otherwise null.
 * Client-side navigations land on documents prerendered for a different card
 * (or on the plain SPA shell), so the slug check is what keeps a stale hero
 * from rendering.
 */
export function getCardPreload(slug: string): CardPreload | null {
  if (typeof document === 'undefined' || !slug) return null;
  if (cached === undefined) {
    const el = document.getElementById(ELEMENT_ID);
    cached = el?.textContent ? parse(el.textContent) : null;
  }
  return cached && cached.slug === slug ? cached : null;
}

/** Test seam — clears the memoized lookup. */
export function resetCardPreloadCache(): void {
  cached = undefined;
}
