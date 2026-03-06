// @ts-nocheck — Deno edge function, not part of frontend build

declare const Deno: { env: { get(key: string): string | undefined }; serve: (handler: (req: Request) => Promise<Response>) => void };

/**
 * Prerender edge function — returns SEO-enriched HTML for /cards/:slug and /search/:slug.
 *
 * Instead of serving an empty SPA shell, this function:
 * 1. Parses the requested path
 * 2. Fetches card/search data from Scryfall
 * 3. Returns complete HTML with <title>, OG tags, JSON-LD, and visible content
 *
 * This is proxied via _redirects for /cards/* and /search/* paths.
 * The HTML includes the SPA entry point so the app hydrates normally for interactive users.
 */

const SITE_URL = 'https://offmeta.app';
const OG_IMAGE_DEFAULT = `${SITE_URL}/og-image.png`;
const SCRYFALL_API = 'https://api.scryfall.com';

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugToName(slug: string): string {
  return decodeURIComponent(slug).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function slugToQuery(slug: string): string {
  return decodeURIComponent(slug).replace(/-/g, ' ').trim();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ── Scryfall fetchers ────────────────────────────────────────────────────────

interface ScryfallCard {
  name: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  set_name?: string;
  rarity?: string;
  image_uris?: { normal?: string; art_crop?: string };
  card_faces?: Array<{ image_uris?: { normal?: string; art_crop?: string } }>;
  prices?: { usd?: string; usd_foil?: string };
  legalities?: Record<string, string>;
  scryfall_uri?: string;
}

interface ScryfallSearchResult {
  total_cards: number;
  data: ScryfallCard[];
}

async function fetchCardByName(name: string): Promise<ScryfallCard | null> {
  try {
    const res = await fetch(`${SCRYFALL_API}/cards/named?fuzzy=${encodeURIComponent(name)}`);
    if (!res.ok) return null;
    return await res.json() as ScryfallCard;
  } catch {
    return null;
  }
}

async function fetchSearchResults(query: string, limit = 6): Promise<ScryfallSearchResult | null> {
  try {
    const res = await fetch(`${SCRYFALL_API}/cards/search?q=${encodeURIComponent(query)}&page=1`);
    if (!res.ok) return null;
    const data = await res.json() as ScryfallSearchResult;
    // Limit to first N for the preview
    data.data = data.data.slice(0, limit);
    return data;
  } catch {
    return null;
  }
}

// ── Image helper ─────────────────────────────────────────────────────────────

function getCardImage(card: ScryfallCard): string | null {
  if (card.image_uris?.art_crop) return card.image_uris.art_crop;
  if (card.image_uris?.normal) return card.image_uris.normal;
  if (card.card_faces?.[0]?.image_uris?.art_crop) return card.card_faces[0].image_uris.art_crop;
  if (card.card_faces?.[0]?.image_uris?.normal) return card.card_faces[0].image_uris.normal;
  return null;
}

// ── HTML builders ────────────────────────────────────────────────────────────

function buildCardPageHtml(card: ScryfallCard, slug: string): string {
  const title = `${card.name} — MTG Card Details | OffMeta`;
  const desc = card.oracle_text
    ? `${card.name} — ${card.type_line ?? 'Card'}. ${card.oracle_text.slice(0, 120)}…`
    : `${card.name} — ${card.type_line ?? 'Magic: The Gathering card'}. View details, prices, legalities, and alternative printings on OffMeta.`;
  const image = getCardImage(card) ?? OG_IMAGE_DEFAULT;
  const canonicalUrl = `${SITE_URL}/cards/${slug}`;
  const price = card.prices?.usd ? `$${card.prices.usd}` : null;

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: card.name,
    description: card.oracle_text ?? card.type_line ?? '',
    image,
    url: canonicalUrl,
    brand: { '@type': 'Brand', name: 'Magic: The Gathering' },
    ...(price ? { offers: { '@type': 'Offer', price: card.prices?.usd, priceCurrency: 'USD', availability: 'https://schema.org/InStock' } } : {}),
  });

  const legalFormats = card.legalities
    ? Object.entries(card.legalities).filter(([, v]) => v === 'legal').map(([k]) => k)
    : [];

  return buildFullHtml({
    title,
    description: desc,
    canonicalUrl,
    image,
    jsonLd,
    bodyContent: `
      <article itemscope itemtype="https://schema.org/Product">
        <h1 itemprop="name">${escapeHtml(card.name)}</h1>
        ${card.type_line ? `<p><strong>Type:</strong> ${escapeHtml(card.type_line)}</p>` : ''}
        ${card.mana_cost ? `<p><strong>Mana Cost:</strong> ${escapeHtml(card.mana_cost)}</p>` : ''}
        ${card.oracle_text ? `<div itemprop="description"><p>${escapeHtml(card.oracle_text)}</p></div>` : ''}
        ${card.set_name ? `<p><strong>Set:</strong> ${escapeHtml(card.set_name)} (${escapeHtml(card.rarity ?? '')})</p>` : ''}
        ${price ? `<p><strong>Price:</strong> ${price}</p>` : ''}
        ${legalFormats.length > 0 ? `<p><strong>Legal in:</strong> ${legalFormats.join(', ')}</p>` : ''}
        <p><a href="${escapeHtml(card.scryfall_uri ?? '#')}">View on Scryfall</a></p>
      </article>
    `,
  });
}

function buildSearchPageHtml(query: string, slug: string, results: ScryfallSearchResult | null): string {
  const titleQuery = query.length > 40 ? query.slice(0, 40) + '…' : query;
  const title = `${titleQuery} — MTG Card Search | OffMeta`;
  const desc = results
    ? `Found ${results.total_cards} Magic: The Gathering cards matching "${query}". Browse results with natural language search on OffMeta.`
    : `Search Magic: The Gathering cards for "${query}" using natural language on OffMeta.`;
  const canonicalUrl = `${SITE_URL}/search/${slug}`;

  const itemListElements = results?.data.map((card, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: card.name,
    url: `${SITE_URL}/cards/${card.name.toLowerCase().replace(/['']/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')}`,
  })) ?? [];

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `MTG cards: ${query}`,
    numberOfItems: results?.total_cards ?? 0,
    itemListElement: itemListElements,
  });

  const cardListHtml = results?.data.map(card => `
    <li>
      <strong>${escapeHtml(card.name)}</strong>
      ${card.type_line ? ` — ${escapeHtml(card.type_line)}` : ''}
      ${card.oracle_text ? `<br><small>${escapeHtml(card.oracle_text.slice(0, 150))}</small>` : ''}
    </li>
  `).join('') ?? '';

  return buildFullHtml({
    title,
    description: desc,
    canonicalUrl,
    image: OG_IMAGE_DEFAULT,
    jsonLd,
    bodyContent: `
      <h1>MTG Card Search: ${escapeHtml(query)}</h1>
      ${results ? `<p>Found ${results.total_cards} cards matching this search.</p>` : '<p>Search for Magic: The Gathering cards using natural language.</p>'}
      ${cardListHtml ? `<ol>${cardListHtml}</ol>` : ''}
      <p><a href="${SITE_URL}">Search more cards on OffMeta</a></p>
    `,
  });
}

interface FullHtmlOptions {
  title: string;
  description: string;
  canonicalUrl: string;
  image: string;
  jsonLd: string;
  bodyContent: string;
}

function buildFullHtml(opts: FullHtmlOptions): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>${escapeHtml(opts.title)}</title>
  <meta name="description" content="${escapeHtml(opts.description)}" />
  <link rel="canonical" href="${escapeHtml(opts.canonicalUrl)}" />
  <meta name="robots" content="noindex, follow" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(opts.canonicalUrl)}" />
  <meta property="og:title" content="${escapeHtml(opts.title)}" />
  <meta property="og:description" content="${escapeHtml(opts.description)}" />
  <meta property="og:image" content="${escapeHtml(opts.image)}" />
  <meta property="og:site_name" content="OffMeta" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(opts.title)}" />
  <meta name="twitter:description" content="${escapeHtml(opts.description)}" />
  <meta name="twitter:image" content="${escapeHtml(opts.image)}" />

  <!-- Structured Data -->
  <script type="application/ld+json">${opts.jsonLd}</script>

  <link rel="icon" type="image/svg+xml" href="${SITE_URL}/favicon.svg" />
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #e0e0e0; background: #0a0a0a; }
    a { color: #7c3aed; }
    h1 { font-size: 1.5rem; }
    ol { padding-left: 1.2rem; }
    li { margin-bottom: 0.75rem; }
    small { color: #999; }
    .cta { margin-top: 2rem; padding: 0.75rem 1.5rem; background: #7c3aed; color: white; text-decoration: none; border-radius: 0.5rem; display: inline-block; }
  </style>
</head>
<body>
  ${opts.bodyContent}
  <p style="margin-top:2rem"><a class="cta" href="${escapeHtml(opts.canonicalUrl)}">Open in OffMeta →</a></p>
  <footer style="margin-top:3rem;padding-top:1rem;border-top:1px solid #333;color:#666;font-size:0.85rem">
    <p>OffMeta — Natural Language MTG Card Search. Powered by <a href="https://scryfall.com">Scryfall</a>.</p>
  </footer>
</body>
</html>`;
}

// ── Request handler ──────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get('path') ?? '';

  if (!path) {
    return new Response(JSON.stringify({ error: 'Missing path parameter' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Match /cards/:slug
    const cardMatch = path.match(/^\/cards\/([a-z0-9-]+)$/);
    if (cardMatch) {
      const slug = cardMatch[1];
      const cardName = slugToName(slug);
      const card = await fetchCardByName(cardName);

      if (!card) {
        return new Response(buildSearchPageHtml(cardName, slug, null), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
        });
      }

      return new Response(buildCardPageHtml(card, slug), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=86400' },
      });
    }

    // Match /search/:slug
    const searchMatch = path.match(/^\/search\/([a-z0-9-]+)$/);
    if (searchMatch) {
      const slug = searchMatch[1];
      const query = slugToQuery(slug);
      const results = await fetchSearchResults(query);

      return new Response(buildSearchPageHtml(query, slug, results), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=1800, s-maxage=3600' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown path' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
