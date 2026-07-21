/**
 * Sitemap Edge Function
 * Generates a dynamic XML sitemap including:
 * - Static pages (home, combos, about, etc.)
 * - Curated SEO search pages
 * - Top card pages from the cards table
 * - Public community decks
 *
 * @module sitemap
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BASE_URL = 'https://offmeta.app';

// Search-first focus: only core search/discovery routes are indexed.
// Tier-3 routes (deckbuilder, market, decks, collection, archetypes,
// deck-recs) are excluded — see mem://product/core-focus.
const STATIC_PAGES = [
  { loc: '/', priority: '1.0', changefreq: 'daily' },
  { loc: '/browse-searches', priority: '0.8', changefreq: 'weekly' },
  { loc: '/combos', priority: '0.8', changefreq: 'weekly' },
  { loc: '/guides', priority: '0.8', changefreq: 'weekly' },
  { loc: '/ai', priority: '0.7', changefreq: 'weekly' },
  { loc: '/docs', priority: '0.6', changefreq: 'weekly' },
  { loc: '/docs/syntax', priority: '0.6', changefreq: 'monthly' },
  { loc: '/about', priority: '0.5', changefreq: 'monthly' },
];

// Static guide slugs — keep in sync with src/data/guides.ts
const GUIDE_SLUGS = [
  'search-by-creature-type',
  'filter-by-color',
  'budget-price-filters',
  'format-legality-search',
  'keyword-ability-search',
  'ramp-and-card-draw',
  'tribal-synergies-for-commander',
  'token-and-sacrifice-synergies',
  'etb-and-flicker-combos',
  'multi-constraint-complex-search',
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch curated search pages and SEO pages
    const [curatedResult, seoResult] = await Promise.all([
      supabase
        .from('curated_searches')
        .select('slug, priority, updated_at')
        .eq('is_active', true)
        .order('priority', { ascending: false }),
      supabase
        .from('seo_pages')
        .select('slug, updated_at')
        .eq('status', 'published')
        .order('updated_at', { ascending: false }),
    ]);

    // Fetch ALL cards with images in paginated batches — Supabase caps a
    // single select at 1000 rows, so we loop with .range() until exhausted.
    // Every /cards/<slug> URL belongs in the sitemap so Google can discover
    // the full catalogue (~32k cards), not just a 500-row snapshot.
    const cards: Array<{ name: string; updated_at: string | null }> = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from('cards')
        .select('name, updated_at')
        .not('image_url', 'is', null)
        .order('name', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      cards.push(...data);
      if (data.length < PAGE) break;
    }

    const curatedSearches = curatedResult.data;
    const seoPages = seoResult.data;

    const today = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    // Static pages
    for (const page of STATIC_PAGES) {
      xml += `  <url>
    <loc>${BASE_URL}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    }

    // Static guide pages
    for (const slug of GUIDE_SLUGS) {
      xml += `  <url>
    <loc>${BASE_URL}/guides/${escapeXml(slug)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
    }

    // Curated search pages (high-value SEO targets)
    if (curatedSearches) {
      for (const search of curatedSearches) {
        const lastmod = search.updated_at
          ? new Date(search.updated_at).toISOString().split('T')[0]
          : today;
        xml += `  <url>
    <loc>${BASE_URL}/search/${escapeXml(search.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${Math.min(Number(search.priority) || 0.7, 0.9)}</priority>
  </url>
`;
      }
    }

    // Card pages
    if (cards) {
      for (const card of cards) {
        const slug = slugify(card.name);
        const lastmod = card.updated_at
          ? new Date(card.updated_at).toISOString().split('T')[0]
          : today;
        xml += `  <url>
    <loc>${BASE_URL}/cards/${escapeXml(slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
      }
    }

    // Public decks excluded from sitemap (Tier-3 — see mem://product/core-focus)

    // AI SEO pages (high priority — AI-optimized content)
    if (seoPages) {
      for (const page of seoPages) {
        const lastmod = page.updated_at
          ? new Date(page.updated_at).toISOString().split('T')[0]
          : today;
        xml += `  <url>
    <loc>${BASE_URL}/ai/${escapeXml(page.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
`;
      }
    }

    xml += `</urlset>`;

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (e) {
    console.error('Sitemap error:', e);
    return new Response('Internal error', { status: 500 });
  }
});
