import fs from 'node:fs/promises';

const SITE_URL = 'https://offmeta.app';
const OUTPUT = 'public/sitemap.xml';

// Keep in sync with real routes in src/AppRoutes.tsx + supabase/functions/sitemap.
// Search-first focus (mem://product/core-focus) — Tier-3 routes (deckbuilder,
// market, decks, collection, archetypes, deck-recs) are excluded.
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

const FALLBACK_CARDS = [
  'Sol Ring', 'Rhystic Study', 'Swords to Plowshares', 'Counterspell',
  'Cyclonic Rift', 'Lightning Bolt', 'Path to Exile', 'Demonic Tutor',
  'Cultivate', 'Kodama\'s Reach',
];

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
// Public/publishable key is safe at build time; RLS still applies.
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function slugifyCardName(name) {
  return name
    .toLowerCase()
    .replace(/['.,]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function pgrest(path) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!resp.ok) return null;
  return resp.json();
}

async function fetchPopularCards() {
  // card_signals is anon-readable and tracks trend/search/click activity per
  // oracle_id. Join through /cards to get printable names.
  const signals = await pgrest(
    'card_signals?select=card_id,trend_score,search_count&order=trend_score.desc.nullslast,search_count.desc.nullslast&limit=1000',
  );
  if (!Array.isArray(signals) || signals.length === 0) return FALLBACK_CARDS;

  const ids = signals.map((s) => s.card_id).filter(Boolean);
  if (ids.length === 0) return FALLBACK_CARDS;

  // PostgREST `in` filter has URL-length limits; chunk to stay safe.
  const CHUNK = 100;
  const nameByOracleId = new Map();
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const inList = chunk.map((id) => `"${id}"`).join(',');
    const rows = await pgrest(`cards?select=oracle_id,name&oracle_id=in.(${inList})`);
    if (Array.isArray(rows)) {
      for (const row of rows) nameByOracleId.set(row.oracle_id, row.name);
    }
  }

  const ordered = ids
    .map((id) => nameByOracleId.get(id))
    .filter((name) => typeof name === 'string' && name.length > 1);

  return ordered.length > 0 ? ordered : FALLBACK_CARDS;
}

async function fetchCuratedSearchSlugs() {
  const rows = await pgrest(
    'curated_searches?select=slug&is_active=eq.true&order=priority.desc.nullslast&limit=500',
  );
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => r.slug).filter(Boolean);
}

async function fetchSeoPageSlugs() {
  const rows = await pgrest(
    "seo_pages?select=slug&status=eq.published&order=published_at.desc.nullslast&limit=500",
  );
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => r.slug).filter(Boolean);
}

function buildSitemap(paths) {
  const now = new Date().toISOString();
  const unique = Array.from(new Set(paths));
  const entries = unique
    .map((path) => `  <url><loc>${SITE_URL}${path}</loc><lastmod>${now}</lastmod></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

const [popularCards, curatedSlugs, seoSlugs] = await Promise.all([
  fetchPopularCards(),
  fetchCuratedSearchSlugs(),
  fetchSeoPageSlugs(),
]);

const cardPaths = popularCards.slice(0, 1000).map((name) => `/cards/${slugifyCardName(name)}`);
const guidePaths = GUIDE_SLUGS.map((slug) => `/guides/${slug}`);
const searchPaths = curatedSlugs.map((slug) => `/search/${slug}`);
const aiPaths = seoSlugs.map((slug) => `/ai/${slug}`);

const allPaths = [
  ...STATIC_PATHS,
  ...guidePaths,
  ...searchPaths,
  ...aiPaths,
  ...cardPaths,
];

const xml = buildSitemap(allPaths);
await fs.writeFile(OUTPUT, xml, 'utf8');
console.log(
  `Generated sitemap with ${new Set(allPaths).size} URLs ` +
    `(cards=${cardPaths.length}, search=${searchPaths.length}, ai=${aiPaths.length}, guides=${guidePaths.length}, static=${STATIC_PATHS.length}).`,
);
