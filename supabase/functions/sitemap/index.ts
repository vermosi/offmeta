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
import { withLogging } from '../_shared/logger.ts';

const BASE_URL = 'https://offmeta.app';

// Search-first focus: only core search/discovery routes are indexed.
// Tier-3 routes (deckbuilder, market, decks, collection, archetypes,
// deck-recs) are excluded — see mem://product/core-focus.
const STATIC_PAGES = [
  { loc: '/' },
  { loc: '/browse-searches' },
  { loc: '/combos' },
  { loc: '/deck-check' },
  { loc: '/guides' },
  { loc: '/ai' },
  { loc: '/docs' },
  { loc: '/docs/syntax' },
  { loc: '/about' },
  { loc: '/search-intents' },
  { loc: '/search-intents/budget' },
  { loc: '/search-intents/hate' },
  { loc: '/search-intents/similar' },
  { loc: '/cards-like' },
];

// Static guide slugs — keep in sync with src/data/guides.ts
// Editorial landing pages — mirrors the indexable entries in
// src/lib/landing/registry.ts. Update both when adding a page.
const LANDING_PAGES = [
  '/mtg/card-draw',
  '/mtg/ramp',
  '/mtg/removal',
  '/mtg/board-wipes',
  '/mtg/protection',
  '/mtg/recursion',
  '/mtg/tutors',
  '/mtg/treasure-hate',
  '/mtg/graveyard-hate',
  '/mtg/artifact-hate',
  '/mtg/token-hate',
  '/mtg/lifegain-hate',
  '/mtg/red/card-draw',
  '/mtg/white/card-draw',
  '/mtg/black/ramp',
  '/mtg/red/ramp',
  '/mtg/green/removal',
  '/commander/card-draw',
  '/commander/ramp',
  '/commander/removal',
  '/commander/board-wipes',
  '/commander/protection',
  '/alternatives/rhystic-study',
  '/alternatives/smothering-tithe',
  '/alternatives/cyclonic-rift',
  '/alternatives/demonic-tutor',
  '/alternatives/dockside-extortionist',
  '/scryfall-alternative',
] as const;

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
  'cards-like-x',
  'frames-and-print-treatments',
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Emit <lastmod> only from an authoritative, row-specific timestamp.
 * Never fall back to the generation date — see sitemap lastmod policy.
 */
function lastmodLine(updatedAt?: string | null): string {
  if (!updatedAt) return '';
  const parsed = new Date(updatedAt);
  if (Number.isNaN(parsed.getTime())) return '';
  return `    <lastmod>${parsed.toISOString().split('T')[0]}</lastmod>\n`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

serve(withLogging('sitemap', async (req) => {
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



    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    // Static pages
    for (const page of STATIC_PAGES) {
      xml += `  <url>
    <loc>${BASE_URL}${page.loc}</loc>
  </url>
`;
    }

    // Static guide pages
    for (const slug of GUIDE_SLUGS) {
      xml += `  <url>
    <loc>${BASE_URL}/guides/${escapeXml(slug)}</loc>
  </url>
`;
    }

    // Editorial landing pages (roles, problems, colors, commander, alternatives).
    // Keep in sync with src/lib/landing/registry.ts (indexable pages only).
    for (const path of LANDING_PAGES) {
      xml += `  <url>
    <loc>${BASE_URL}${path}</loc>
  </url>
`;
    }



    // Curated search pages (high-value SEO targets)
    if (curatedSearches) {
      for (const search of curatedSearches) {
        xml += `  <url>
    <loc>${BASE_URL}/search/${escapeXml(search.slug)}</loc>
${lastmodLine(search.updated_at)}  </url>
`;
      }
    }

    // Card pages
    if (cards) {
      for (const card of cards) {
        const slug = slugify(card.name);
        xml += `  <url>
    <loc>${BASE_URL}/cards/${escapeXml(slug)}</loc>
${lastmodLine(card.updated_at)}  </url>
`;
      }
    }

    // Public decks excluded from sitemap (Tier-3 — see mem://product/core-focus)

    // AI SEO pages (high priority — AI-optimized content)
    if (seoPages) {
      for (const page of seoPages) {
        xml += `  <url>
    <loc>${BASE_URL}/ai/${escapeXml(page.slug)}</loc>
${lastmodLine(page.updated_at)}  </url>
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
}));
