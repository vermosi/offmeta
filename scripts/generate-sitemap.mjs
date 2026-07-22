/**
 * Build-time sitemap generator — writes public/sitemap.xml.
 *
 * IMPORTANT: Lovable hosting does NOT process public/_redirects, so
 * /sitemap.xml is always served from this static file (not from the
 * supabase/functions/sitemap edge function). This script must produce
 * a sitemap that matches the edge function's coverage (~32k cards +
 * curated + AI + guides + static), or search engines will only see
 * whatever we bake in here.
 *
 * Search-first focus (mem://product/core-focus) — Tier-3 routes
 * (deckbuilder, market, decks, collection, archetypes, deck-recs)
 * are excluded intentionally.
 */

import fs from 'node:fs/promises';

const SITE_URL = 'https://offmeta.app';
const OUTPUT = 'public/sitemap.xml';

const STATIC_PATHS = [
  '/',
  '/browse-searches',
  '/combos',
  '/guides',
  '/ai',
  '/docs',
  '/docs/syntax',
  '/about',
];

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

// Truly-offline fallback — only used when SUPABASE env vars are absent.
// If env is present but a request fails, we throw so CI/build surfaces it.
const OFFLINE_FALLBACK_CARDS = [
  'Sol Ring', 'Rhystic Study', 'Swords to Plowshares', 'Counterspell',
  'Cyclonic Rift', 'Lightning Bolt', 'Path to Exile', 'Demonic Tutor',
  'Cultivate', "Kodama's Reach",
];

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const HAS_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_KEY);

function slugifyCardName(name) {
  return name
    .toLowerCase()
    .replace(/['.,]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * PostgREST fetch. Throws on non-2xx when env is present so a broken
 * build fails loudly instead of silently shipping a 28-URL stub.
 */
async function pgrest(path, { headers = {} } = {}) {
  if (!HAS_SUPABASE) return null;
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: 'application/json',
      ...headers,
    },
  });
  if (!resp.ok) {
    throw new Error(`PostgREST ${resp.status} on ${path}: ${await resp.text()}`);
  }
  return resp.json();
}

/**
 * Paginate through every card that has an image, matching the edge
 * function's filter. PostgREST caps rows per request; we page in
 * blocks of 1000 using Range headers until exhausted.
 */
async function fetchAllCards() {
  if (!HAS_SUPABASE) return OFFLINE_FALLBACK_CARDS.map((name) => ({ name }));

  const PAGE = 1000;
  const MAX = 50000; // sitemap protocol cap; well above current catalogue
  const all = [];
  for (let from = 0; from < MAX; from += PAGE) {
    const to = from + PAGE - 1;
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/cards?select=name,updated_at&image_url=not.is.null&order=name.asc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Accept: 'application/json',
          Range: `${from}-${to}`,
          'Range-Unit': 'items',
        },
      },
    );
    if (!resp.ok) {
      throw new Error(`cards range ${from}-${to} failed: ${resp.status} ${await resp.text()}`);
    }
    const rows = await resp.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  return all;
}

async function fetchCuratedSearches() {
  const rows = await pgrest(
    'curated_searches?select=slug,updated_at&is_active=eq.true&order=priority.desc.nullslast&limit=1000',
  );
  return Array.isArray(rows) ? rows.filter((r) => r.slug) : [];
}

async function fetchSeoPages() {
  const rows = await pgrest(
    'seo_pages?select=slug,updated_at&status=eq.published&order=published_at.desc.nullslast&limit=2000',
  );
  return Array.isArray(rows) ? rows.filter((r) => r.slug) : [];
}

function urlEntry(path, lastmod, changefreq, priority) {
  const parts = [`<loc>${escapeXml(SITE_URL + path)}</loc>`];
  if (lastmod) parts.push(`<lastmod>${lastmod}</lastmod>`);
  if (changefreq) parts.push(`<changefreq>${changefreq}</changefreq>`);
  if (priority) parts.push(`<priority>${priority}</priority>`);
  return `  <url>${parts.join('')}</url>`;
}

function toLastmodDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

const today = new Date().toISOString().split('T')[0];

let cards = [];
let curated = [];
let seoPages = [];

try {
  [cards, curated, seoPages] = await Promise.all([
    fetchAllCards(),
    HAS_SUPABASE ? fetchCuratedSearches() : Promise.resolve([]),
    HAS_SUPABASE ? fetchSeoPages() : Promise.resolve([]),
  ]);
} catch (err) {
  if (HAS_SUPABASE) {
    console.error('[sitemap] Supabase fetch failed:', err);
    process.exit(1); // fail loud — never ship a stub sitemap when env is set
  }
  console.warn('[sitemap] No Supabase env; writing static+guides only.');
}

const seen = new Set();
const lines = [];

const pushUnique = (path, lastmod, changefreq, priority) => {
  if (!path || seen.has(path)) return;
  seen.add(path);
  lines.push(urlEntry(path, lastmod, changefreq, priority));
};

for (const p of STATIC_PATHS) {
  const priority = p === '/' ? '1.0' : '0.8';
  const changefreq = p === '/' ? 'daily' : 'weekly';
  pushUnique(p, today, changefreq, priority);
}

for (const slug of GUIDE_SLUGS) {
  pushUnique(`/guides/${slug}`, today, 'monthly', '0.7');
}

for (const row of curated) {
  pushUnique(`/search/${row.slug}`, toLastmodDate(row.updated_at) ?? today, 'weekly', '0.8');
}

for (const row of seoPages) {
  pushUnique(`/ai/${row.slug}`, toLastmodDate(row.updated_at) ?? today, 'weekly', '0.9');
}

for (const card of cards) {
  const slug = slugifyCardName(card.name);
  if (!slug) continue;
  pushUnique(`/cards/${slug}`, toLastmodDate(card.updated_at) ?? today, 'weekly', '0.6');
}

const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  lines.join('\n') +
  `\n</urlset>\n`;

await fs.writeFile(OUTPUT, xml, 'utf8');

console.log(
  `[sitemap] Wrote ${seen.size} URLs ` +
    `(cards=${cards.length}, search=${curated.length}, ai=${seoPages.length}, ` +
    `guides=${GUIDE_SLUGS.length}, static=${STATIC_PATHS.length}, ` +
    `supabase=${HAS_SUPABASE ? 'on' : 'off'}).`,
);

// Fail loud if env was present but coverage is suspiciously small — likely
// means a query silently returned []. Prevents another 28-URL regression.
if (HAS_SUPABASE && cards.length < 100) {
  console.error(
    `[sitemap] Only ${cards.length} cards fetched with Supabase env set — ` +
      `refusing to publish a stub sitemap.`,
  );
  process.exit(1);
}
