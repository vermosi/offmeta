/**
 * JSON-LD injection and builders for docs/index pages.
 */

import { describe, expect, it, afterEach } from 'vitest';
import {
  injectJsonLd,
  injectJsonLdGraphs,
  buildWebSiteJsonLd,
  buildBreadcrumbJsonLd,
  buildDocsArticleJsonLd,
} from '@/lib/seo';

function parseSlot(slot: string): Record<string, unknown> | null {
  const el = document.getElementById(`offmeta-jsonld-${slot}`);
  return el?.textContent ? JSON.parse(el.textContent) : null;
}

afterEach(() => {
  document.head
    .querySelectorAll('script[type="application/ld+json"]')
    .forEach((el) => el.remove());
});

describe('injectJsonLd', () => {
  it('keeps slots independent so multiple graphs coexist', () => {
    injectJsonLd({ '@type': 'BreadcrumbList' }, 'breadcrumb');
    injectJsonLd({ '@type': 'TechArticle' }, 'article');

    expect(parseSlot('breadcrumb')).toEqual({ '@type': 'BreadcrumbList' });
    expect(parseSlot('article')).toEqual({ '@type': 'TechArticle' });
  });

  it('injectJsonLdGraphs cleans up every block it added', () => {
    const cleanup = injectJsonLdGraphs([
      { slot: 'website', data: buildWebSiteJsonLd() },
      {
        slot: 'breadcrumb',
        data: buildBreadcrumbJsonLd([
          { name: 'OffMeta', url: 'https://offmeta.app/' },
          { name: 'Docs', url: 'https://offmeta.app/docs' },
        ]),
      },
    ]);

    expect(parseSlot('website')).toMatchObject({ '@type': 'WebSite' });
    expect(parseSlot('breadcrumb')).toMatchObject({
      '@type': 'BreadcrumbList',
    });

    cleanup();

    expect(parseSlot('website')).toBeNull();
    expect(parseSlot('breadcrumb')).toBeNull();
  });
});

describe('JSON-LD builders', () => {
  it('WebSite exposes a SearchAction entry point', () => {
    const site = buildWebSiteJsonLd('es') as Record<string, unknown>;
    expect(site['@type']).toBe('WebSite');
    expect(site.inLanguage).toBe('es');
    expect(site.potentialAction).toMatchObject({ '@type': 'SearchAction' });
  });

  it('BreadcrumbList positions items in order', () => {
    const crumbs = buildBreadcrumbJsonLd([
      { name: 'OffMeta', url: 'https://offmeta.app/' },
      { name: 'Docs', url: 'https://offmeta.app/docs' },
      { name: 'Syntax', url: 'https://offmeta.app/docs/syntax' },
    ]) as { itemListElement: Array<{ position: number; name: string }> };

    expect(crumbs.itemListElement.map((i) => i.position)).toEqual([1, 2, 3]);
    expect(crumbs.itemListElement[2].name).toBe('Syntax');
  });

  it('docs Article carries required Article fields', () => {
    const article = buildDocsArticleJsonLd({
      title: 'Scryfall Syntax Cheat Sheet',
      description: 'Maps natural language to Scryfall operators.',
      url: 'https://offmeta.app/docs/syntax',
      section: 'Docs',
      keywords: ['Scryfall syntax'],
    }) as Record<string, unknown>;

    expect(article['@type']).toBe('TechArticle');
    expect(article.headline).toBe('Scryfall Syntax Cheat Sheet');
    expect(article.datePublished).toBeTruthy();
    expect(article.dateModified).toBeTruthy();
    expect(article.publisher).toBeTruthy();
    expect(article.keywords).toBe('Scryfall syntax');
  });
});
