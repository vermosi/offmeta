/**
 * Canonical link builder for landing-page search references.
 * @module lib/landing/searchHref
 */

import { queryToSlug } from '@/lib/search-slug';

export function searchHref(query: string): string {
  return `/search/${queryToSlug(query)}`;
}
