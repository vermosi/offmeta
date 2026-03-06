/**
 * Slug ↔ card name conversion utilities for card detail pages.
 * Slug format: lowercase, spaces → hyphens, special chars stripped.
 * @module lib/card-slug
 */

/**
 * Convert a card name to a URL-safe slug.
 * @example cardNameToSlug("Sol Ring") → "sol-ring"
 * @example cardNameToSlug("Swords to Plowshares") → "swords-to-plowshares"
 */
export function cardNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '') // Remove apostrophes
    .replace(/[^a-z0-9\s-]/g, '') // Strip special chars
    .trim()
    .replace(/\s+/g, '-') // Spaces → hyphens
    .replace(/-+/g, '-'); // Collapse multiple hyphens
}

/**
 * Convert a slug back to a best-guess card name for Scryfall exact lookup.
 * Hyphens become spaces and words are title-cased.
 * @example slugToCardName("sol-ring") → "Sol Ring"
 */
export function slugToCardName(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
