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
