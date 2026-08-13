/**
 * Landing page registry.
 *
 * A path resolves to a page only if it was explicitly declared. Nothing is
 * generated from parameter combinations, and `indexable` controls whether the
 * page is allowed into search indexes and the sitemap.
 */

import { ROLE_PAGES } from './content/roles';
import { PROBLEM_PAGES } from './content/problems';
import { COLOR_ROLE_PAGES } from './content/colors';
import { COMMANDER_PAGES } from './content/commander';
import { ALTERNATIVE_PAGES } from './content/alternatives';
import { COMPARISON_PAGES } from './content/comparison';
import type { LandingFamily, LandingPageConfig } from './types';

export const LANDING_PAGES: readonly LandingPageConfig[] = [
  ...ROLE_PAGES,
  ...PROBLEM_PAGES,
  ...COLOR_ROLE_PAGES,
  ...COMMANDER_PAGES,
  ...ALTERNATIVE_PAGES,
  ...COMPARISON_PAGES,
];

const BY_PATH = new Map<string, LandingPageConfig>(
  LANDING_PAGES.map((page) => [page.path, page]),
);

/** Normalize an incoming pathname (strip trailing slash, lowercase). */
export function normalizeLandingPath(pathname: string): string {
  const trimmed = pathname.trim().toLowerCase().replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

export function getLandingPage(pathname: string): LandingPageConfig | undefined {
  return BY_PATH.get(normalizeLandingPath(pathname));
}

export function getLandingPagesByFamily(
  family: LandingFamily,
): LandingPageConfig[] {
  return LANDING_PAGES.filter((page) => page.family === family);
}

/** Pages allowed into sitemaps and search indexes. */
export function getIndexableLandingPages(): LandingPageConfig[] {
  return LANDING_PAGES.filter((page) => page.indexable);
}
