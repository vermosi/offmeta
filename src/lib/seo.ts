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
  twitterCard?: 'summary' | 'summary_large_image';
  /** Additional meta tags to set */
  extraMeta?: Record<string, string>;
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
  setMeta('twitter:card', opts.twitterCard ?? 'summary');

  if (opts.image) {
    setMeta('og:image', opts.image, 'property');
    setMeta('twitter:image', opts.image);
  }

  if (opts.extraMeta) {
    for (const [key, value] of Object.entries(opts.extraMeta)) {
      setMeta(key, value);
    }
  }

  setCanonical(opts.url);

  return () => {
    document.title = prevTitle;
    setCanonical('https://offmeta.app/');
  };
}

// ── Search canonical helpers ──────────────────────────────────────────────────

import { queryToSlug } from '@/lib/search-slug';

/**
 * Build a canonical URL for a search page.
 * Uses the compiled Scryfall query (not the raw NL input) so that
 * synonymous searches ("cheap green ramp" vs "budget green ramp spells")
 * resolve to the same canonical when they compile to the same query.
 */
export function buildSearchCanonical(compiledQuery: string): string {
  const slug = queryToSlug(compiledQuery);
  return slug ? `https://offmeta.app/search/${slug}` : 'https://offmeta.app/';
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

// ── JSON-LD builders ──────────────────────────────────────────────────────────

import type { ScryfallCard } from '@/types/card';

/**
 * Build enriched Product JSON-LD for a single MTG card.
 * Includes multiple offers (regular + foil), game-specific attributes,
 * seller info, and item condition to maximize rich-result CTR.
 */
export function buildCardJsonLd(card: ScryfallCard, pageUrl: string): Record<string, unknown> {
  const image = card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal;
  const usd = card.prices?.usd;
  const foil = card.prices?.usd_foil;

  // Build offers array (regular + foil)
  const offers: Record<string, unknown>[] = [];
  if (usd) {
    offers.push({
      '@type': 'Offer',
      price: usd,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      url: card.purchase_uris?.tcgplayer ?? pageUrl,
      seller: { '@type': 'Organization', name: 'TCGplayer' },
      name: `${card.name} (Regular)`,
    });
  }
  if (foil) {
    offers.push({
      '@type': 'Offer',
      price: foil,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      url: card.purchase_uris?.tcgplayer ?? pageUrl,
      seller: { '@type': 'Organization', name: 'TCGplayer' },
      name: `${card.name} (Foil)`,
    });
  }

  // Build richer description
  const oracleSnippet = card.oracle_text
    ? card.oracle_text.length > 200 ? card.oracle_text.slice(0, 200) + '…' : card.oracle_text
    : '';
  const description = oracleSnippet
    ? `${card.name} is a ${card.type_line}. ${oracleSnippet}`
    : `${card.name} — ${card.type_line}`;

  // Game-specific properties
  const additionalProperty: Record<string, unknown>[] = [];
  if (card.rarity) {
    additionalProperty.push({ '@type': 'PropertyValue', name: 'Rarity', value: card.rarity });
  }
  if (card.set_name) {
    additionalProperty.push({ '@type': 'PropertyValue', name: 'Set', value: card.set_name });
  }
  if (card.mana_cost) {
    additionalProperty.push({ '@type': 'PropertyValue', name: 'Mana Cost', value: card.mana_cost });
  }
  if (card.cmc != null) {
    additionalProperty.push({ '@type': 'PropertyValue', name: 'Mana Value', value: String(card.cmc) });
  }
  if (card.colors?.length) {
    additionalProperty.push({ '@type': 'PropertyValue', name: 'Colors', value: card.colors.join(', ') });
  }
  if (card.power != null && card.toughness != null) {
    additionalProperty.push({ '@type': 'PropertyValue', name: 'Power/Toughness', value: `${card.power}/${card.toughness}` });
  }

  const product: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: card.name,
    description,
    image,
    url: pageUrl,
    brand: { '@type': 'Brand', name: 'Magic: The Gathering' },
    category: card.type_line,
    sku: card.id,
    mpn: card.collector_number ?? undefined,
    ...(additionalProperty.length > 0 && { additionalProperty }),
    ...(offers.length === 1 && { offers: offers[0] }),
    ...(offers.length > 1 && { offers: { '@type': 'AggregateOffer', lowPrice: usd, highPrice: foil, priceCurrency: 'USD', offerCount: offers.length, offers } }),
  };

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

/**
 * Build FAQPage JSON-LD from question/answer pairs.
 * Enables rich FAQ snippets in Google search results.
 */
export function buildFaqJsonLd(
  faqs: Array<{ question: string; answer: string }>,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Build card-specific FAQ entries from card data for rich snippets.
 */
export function buildCardFaqs(card: ScryfallCard): Array<{ question: string; answer: string }> {
  const faqs: Array<{ question: string; answer: string }> = [];
  const oracle = card.oracle_text ?? card.card_faces?.map((f) => f.oracle_text).filter(Boolean).join(' ') ?? '';

  // Price FAQ
  const usd = card.prices?.usd;
  const foil = card.prices?.usd_foil;
  if (usd) {
    faqs.push({
      question: `How much does ${card.name} cost?`,
      answer: `${card.name} is currently priced at $${usd} USD for a regular copy${foil ? ` and $${foil} USD for a foil version` : ''}. Prices are sourced from TCGplayer and may vary.`,
    });
  }

  // Format legality FAQ
  const legalFormats = Object.entries(card.legalities)
    .filter(([, v]) => v === 'legal')
    .map(([f]) => f);
  if (legalFormats.length > 0) {
    const isCommanderLegal = legalFormats.includes('commander');
    faqs.push({
      question: `Is ${card.name} legal in Commander?`,
      answer: isCommanderLegal
        ? `Yes, ${card.name} is legal in Commander (EDH). It is also legal in: ${legalFormats.slice(0, 8).join(', ')}.`
        : `No, ${card.name} is not legal in Commander. It is currently legal in: ${legalFormats.slice(0, 8).join(', ')}.`,
    });
  }

  // What does it do FAQ
  if (oracle) {
    const truncated = oracle.length > 300 ? oracle.slice(0, 300) + '…' : oracle;
    faqs.push({
      question: `What does ${card.name} do?`,
      answer: `${card.name} is a ${card.type_line}${card.mana_cost ? ` that costs ${card.mana_cost}` : ''}. ${truncated}`,
    });
  }

  // Power/toughness for creatures
  if (card.power != null && card.toughness != null) {
    faqs.push({
      question: `What are ${card.name}'s stats?`,
      answer: `${card.name} is a ${card.power}/${card.toughness} ${card.type_line} with a mana value of ${card.cmc}.${card.rarity ? ` It is ${card.rarity} rarity.` : ''}`,
    });
  }

  return faqs;
}
