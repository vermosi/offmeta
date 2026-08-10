/**
 * Slug ↔ card name conversion utilities for card detail pages.
 * Slug format: lowercase, spaces → hyphens, diacritics normalized to ASCII.
 * @module lib/card-slug
 */

/**
 * Normalize diacritics / accented characters to their ASCII base.
 * Uses Unicode NFD decomposition to split base char + combining mark,
 * then strips the combining marks.
 * @example normalizeDiacritics("Ökun") → "Okun"
 * @example normalizeDiacritics("Séance") → "Seance"
 */
function normalizeDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Convert a card name to a URL-safe slug.
 * @example cardNameToSlug("Sol Ring") → "sol-ring"
 * @example cardNameToSlug("Ökun, Ruin Sage") → "okun-ruin-sage"
 * @example cardNameToSlug("Séance") → "seance"
 */
export function cardNameToSlug(name: string): string {
  return normalizeDiacritics(name)
    .toLowerCase()
    .replace(/['']/g, '') // Remove apostrophes
    .replace(/[^a-z0-9\s-]/g, '') // Strip remaining special chars
    .trim()
    .replace(/\s+/g, '-') // Spaces → hyphens
    .replace(/-+/g, '-'); // Collapse multiple hyphens
}

/**
 * Convert a slug back to a best-guess card name for Scryfall exact lookup.
 * Hyphens become spaces and words are title-cased.
 * Note: diacritics cannot be recovered from the slug — the fuzzy Scryfall
 * fallback in getCardByName handles resolution.
 * @example slugToCardName("sol-ring") → "Sol Ring"
 */
export function slugToCardName(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Normalize a raw URL slug into the canonical slug shape used by
 * `/cards/:slug`. Handles the malformed variants that show up in real
 * traffic: percent-encoding, underscores/plus signs, mixed case, stray
 * punctuation, file extensions, and duplicated or edge hyphens.
 *
 * @example normalizeCardSlug('Sol_Ring') → 'sol-ring'
 * @example normalizeCardSlug('/sol--ring/') → 'sol-ring'
 * @example normalizeCardSlug('Sensei%27s-Divining-Top') → 'senseis-divining-top'
 */
export function normalizeCardSlug(rawSlug: string): string {
  let value = rawSlug ?? '';
  try {
    value = decodeURIComponent(value);
  } catch {
    // Malformed percent-encoding — fall back to the raw value.
  }

  return normalizeDiacritics(value)
    .toLowerCase()
    .replace(/\.(html?|php|aspx?)$/, '') // strip stray file extensions
    .replace(/['’]/g, '')
    .replace(/[_+\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Build progressively shorter card-name candidates from a slug so a fuzzy
 * resolver gets more than one chance to land on the intended card. Longest
 * (most specific) candidate first.
 *
 * @example slugNameCandidates('sol-ring-mtg-card')
 *   → ['Sol Ring Mtg Card', 'Sol Ring Mtg', 'Sol Ring']
 */
export function slugNameCandidates(slug: string, maxCandidates = 3): string[] {
  const normalized = normalizeCardSlug(slug);
  if (!normalized) return [];

  const words = normalized.split('-').filter(Boolean);
  const candidates: string[] = [];
  for (let length = words.length; length >= 1 && candidates.length < maxCandidates; length--) {
    candidates.push(slugToCardName(words.slice(0, length).join('-')));
  }
  return candidates;
}
