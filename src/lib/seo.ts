/**
 * Shared SEO utilities for setting document head meta tags.
 * Avoids duplicating meta-tag management across pages.
 */

interface SeoOptions {
  title: string;
  description: string;
  url: string;
  type?: string;
  image?: string;
}

/** Set or update a <meta> element in the document head. */
function setMeta(nameOrProp: string, content: string, attr: 'name' | 'property' = 'name') {
  let el = document.querySelector(`meta[${attr}="${nameOrProp}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, nameOrProp);
    document.head.appendChild(el);
  }
  el.content = content;
}

/** Set or update the canonical <link> element. */
function setCanonical(url: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = url;
}

/**
 * Apply SEO meta tags, Open Graph, Twitter Card, and canonical URL.
 * Call from a useEffect and return the cleanup function.
 */
export function applySeoMeta(opts: SeoOptions): () => void {
  const prevTitle = document.title;
  document.title = opts.title;

  setMeta('description', opts.description);
  setMeta('og:title', opts.title, 'property');
  setMeta('og:description', opts.description, 'property');
  setMeta('og:url', opts.url, 'property');
  setMeta('og:type', opts.type ?? 'article', 'property');
  setMeta('twitter:title', opts.title);
  setMeta('twitter:description', opts.description);

  if (opts.image) {
    setMeta('og:image', opts.image, 'property');
    setMeta('twitter:image', opts.image);
  }

  setCanonical(opts.url);

  return () => {
    document.title = prevTitle;
    setCanonical('https://offmeta.app/');
  };
}

// ── JSON-LD Structured Data ───────────────────────────────────────────────────

const JSON_LD_ID = 'offmeta-jsonld';

/**
 * Inject or update a JSON-LD script block in the document head.
 * Call with any valid JSON-LD object (Product, ItemList, BreadcrumbList, etc.).
 * Returns a cleanup function that removes the script element.
 */
export function injectJsonLd(data: Record<string, unknown>): () => void {
  let el = document.getElementById(JSON_LD_ID) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = JSON_LD_ID;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);

  return () => {
    el?.remove();
  };
}

/**
 * Remove any existing JSON-LD block injected by injectJsonLd.
 */
export function removeJsonLd(): void {
  document.getElementById(JSON_LD_ID)?.remove();
}

// ── JSON-LD builders ──────────────────────────────────────────────────────────

import type { ScryfallCard } from '@/types/card';

/**
 * Build Product JSON-LD for a single MTG card.
 */
export function buildCardJsonLd(card: ScryfallCard, pageUrl: string): Record<string, unknown> {
  const image = card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal;
  const price = card.prices?.usd;

  const product: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: card.name,
    description: card.oracle_text ?? `${card.name} — ${card.type_line}`,
    image,
    url: pageUrl,
    brand: { '@type': 'Brand', name: 'Magic: The Gathering' },
    category: card.type_line,
  };

  if (price) {
    product.offers = {
      '@type': 'Offer',
      price,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: card.purchase_uris?.tcgplayer ?? pageUrl,
    };
  }

  return product;
}

/**
 * Build an ItemList JSON-LD for search results.
 */
export function buildSearchResultsJsonLd(
  cards: ScryfallCard[],
  queryDescription: string,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `MTG cards: ${queryDescription}`,
    description: `Magic: The Gathering cards matching "${queryDescription}"`,
    numberOfItems: cards.length,
    itemListElement: cards.slice(0, 20).map((card, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: card.name,
        description: card.oracle_text ?? card.type_line,
        image: card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal,
        url: `https://offmeta.app/cards/${encodeURIComponent(
          card.name.toLowerCase().replace(/['']/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-'),
        )}`,
        ...(card.prices?.usd
          ? {
              offers: {
                '@type': 'Offer',
                price: card.prices.usd,
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
              },
            }
          : {}),
      },
    })),
  };
}

/**
 * Build BreadcrumbList JSON-LD.
 */
export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; url: string }>,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
