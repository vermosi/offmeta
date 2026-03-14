/**
 * Sitemap Edge Function
 * Generates a dynamic XML sitemap including:
 * - Static pages (home, combos, about, etc.)
 * - Curated SEO search pages
 * - Top card pages from the cards table
 *
 * @module sitemap
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BASE_URL = 'https://offmeta.lovable.app';

const STATIC_PAGES = [
  { loc: '/', priority: '1.0', changefreq: 'daily' },
  { loc: '/browse-searches', priority: '0.8', changefreq: 'weekly' },
  { loc: '/combos', priority: '0.8', changefreq: 'weekly' },
  { loc: '/market-trends', priority: '0.7', changefreq: 'daily' },
  { loc: '/about', priority: '0.5', changefreq: 'monthly' },
  { loc: '/guides', priority: '0.6', changefreq: 'weekly' },
  { loc: '/syntax', priority: '0.5', changefreq: 'monthly' },
  { loc: '/browse-decks', priority: '0.7', changefreq: 'daily' },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
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

    // Fetch curated search pages
    const { data: curatedSearches } = await supabase
      .from('curated_searches')
      .select('slug, priority, updated_at')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    // Fetch top cards (most relevant ones with images)
    const { data: cards } = await supabase
      .from('cards')
      .select('name, updated_at')
      .not('image_url', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(500);

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

    // Curated search pages (high-value SEO targets)
    if (curatedSearches) {
      for (const search of curatedSearches) {
        const lastmod = search.updated_at
          ? new Date(search.updated_at).toISOString().split('T')[0]
          : today;
        xml += `  <url>
    <loc>${BASE_URL}/search/${search.slug}</loc>
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
    <loc>${BASE_URL}/cards/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
      }
    }

    xml += `</urlset>`;

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (e) {
    console.error('Sitemap error:', e);
    return new Response('Internal error', { status: 500 });
  }
});
