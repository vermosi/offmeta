/**
 * Search query ↔ URL slug conversion for SEO-friendly search URLs.
 * Transforms natural language queries into URL-safe slugs for `/search/:slug`.
 * @module lib/search-slug
 */

const MAX_SLUG_LENGTH = 80;

/**
 * Convert a natural language search query to a URL-safe slug.
 * @example queryToSlug("cheap green ramp spells") → "cheap-green-ramp-spells"
 * @example queryToSlug("creatures that make treasure") → "creatures-that-make-treasure"
 */
export function queryToSlug(query: string): string {
  return query
    .toLowerCase()
    .replace(/['']/g, '')           // Remove apostrophes
    .replace(/[^a-z0-9\s-]/g, '')   // Strip special chars
    .trim()
    .replace(/\s+/g, '-')           // Spaces → hyphens
    .replace(/-+/g, '-')            // Collapse multiple hyphens
    .slice(0, MAX_SLUG_LENGTH)      // Truncate for URL sanity
    .replace(/-$/, '');             // Remove trailing hyphen from truncation
}

/**
 * Convert a URL slug back to a natural language query string.
 * @example slugToQuery("cheap-green-ramp-spells") → "cheap green ramp spells"
 */
export function slugToQuery(slug: string): string {
  return decodeURIComponent(slug).replace(/-/g, ' ').trim();
}
