import { describe, expect, it } from 'vitest';
import {
  LANDING_PAGES,
  getIndexableLandingPages,
  getLandingPage,
  normalizeLandingPath,
} from './registry';

describe('landing registry', () => {
  it('has unique paths', () => {
    const paths = LANDING_PAGES.map((page) => page.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('resolves declared paths and rejects undeclared ones', () => {
    expect(getLandingPage('/mtg/treasure-hate')).toBeDefined();
    expect(getLandingPage('/mtg/treasure-hate/')).toBeDefined();
    expect(getLandingPage('/mtg/not-a-real-page')).toBeUndefined();
    expect(getLandingPage('/mtg/blue/treasure-hate')).toBeUndefined();
  });

  it('normalizes paths consistently', () => {
    expect(normalizeLandingPath('/MTG/Ramp/')).toBe('/mtg/ramp');
    expect(normalizeLandingPath('/')).toBe('/');
  });

  it('keeps every page substantive enough to index', () => {
    for (const page of getIndexableLandingPages()) {
      expect(page.path.startsWith('/'), page.path).toBe(true);
      expect(page.title.length, page.path).toBeLessThanOrEqual(60);
      expect(page.description.length, page.path).toBeLessThanOrEqual(160);
      expect(page.description.length, page.path).toBeGreaterThan(50);
      expect(page.intentPaths.length, page.path).toBeGreaterThanOrEqual(3);
      expect(page.searchQuery.length, page.path).toBeGreaterThan(3);
      expect(page.explanation?.paragraphs.length ?? 0, page.path).toBeGreaterThanOrEqual(2);
    }
  });

  it('only links to internal routes', () => {
    for (const page of LANDING_PAGES) {
      for (const related of page.relatedPages ?? []) {
        expect(related.href.startsWith('/'), related.href).toBe(true);
      }
    }
  });
});
