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

import './load-env.mjs';
import fs from 'node:fs/promises';

const SITE_URL = 'https://offmeta.app';
const OUTPUT = 'public/sitemap.xml';

const STATIC_PATHS = [
  '/',
  '/browse-searches',
  '/combos',
  '/deck-check',
  '/guides',
  '/ai',
  '/docs',
  '/docs/syntax',
  '/about',
  '/privacy',
  '/terms',

  '/search-intents',
  '/search-intents/budget',
  '/search-intents/hate',
  '/search-intents/similar',
  '/cards-like',
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
  'cards-like-x',
  'frames-and-print-treatments',
];

// Editorial landing pages. This node script cannot import the TypeScript
// registry, so the indexable paths are read straight out of the config
// sources — the registry stays the single source of truth.
const LANDING_CONTENT_DIR = 'src/lib/landing/content';
const MIN_EXPECTED_LANDING_PAGES = 28;

async function readIndexableLandingPaths() {
  const files = await fs.readdir(LANDING_CONTENT_DIR);
  const paths = [];
  for (const file of files) {
    if (!file.endsWith('.ts')) continue;
    const source = await fs.readFile(`${LANDING_CONTENT_DIR}/${file}`, 'utf8');
    // Each config declares `path: '/...'` and, shortly after, `indexable: <bool>`.
    const configRe = /path:\s*'([^']+)'[\s\S]{0,400}?indexable:\s*(true|false)/g;
    let match;
    while ((match = configRe.exec(source)) !== null) {
      const [, path, indexable] = match;
      if (indexable === 'true' && path.startsWith('/')) paths.push(path);
    }
  }
  return [...new Set(paths)];
}


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

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 4;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * fetch with an abort timeout + exponential backoff. Statement timeouts
 * (PostgREST 57014 / HTTP 500-504) and network blips are retried instead
 * of failing the whole build.
 */
async function fetchWithRetry(url, { headers = {}, label = url } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const resp = await fetch(url, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Accept: 'application/json',
          ...headers,
        },
        signal: controller.signal,
      });
      if (!resp.ok) {
        const body = await resp.text();
        const retryable = resp.status >= 500 || resp.status === 408 || resp.status === 429;
        const err = new Error(`${label} failed: ${resp.status} ${body}`);
        if (!retryable) throw err;
        lastErr = err;
      } else {
        return resp.json();
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('failed: 4') && !err.message.includes('408') && !err.message.includes('429')) {
        throw err;
      }
      lastErr = err;
    } finally {
      clearTimeout(timer);
    }
    if (attempt < MAX_ATTEMPTS) {
      const backoff = 500 * 2 ** (attempt - 1);
      console.warn(`[sitemap] retry ${attempt}/${MAX_ATTEMPTS - 1} for ${label} in ${backoff}ms`);
      await sleep(backoff);
    }
  }
  throw lastErr ?? new Error(`${label} failed`);
}

/**
 * PostgREST fetch. Throws on non-2xx when env is present so a broken
 * build fails loudly instead of silently shipping a 28-URL stub.
 */
async function pgrest(path, { headers = {} } = {}) {
  if (!HAS_SUPABASE) return null;
  return fetchWithRetry(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers,
    label: `PostgREST ${path}`,
  });
}

/**
 * Paginate through every card that has an image.
 *
 * Uses keyset pagination on the primary key (oracle_id) rather than
 * Range/OFFSET: deep offsets force Postgres to scan and discard every
 * preceding row, which blows past the statement timeout around 20k+
 * rows. Keyset stays O(page) for every page.
 */
async function fetchAllCards() {
  if (!HAS_SUPABASE) return OFFLINE_FALLBACK_CARDS.map((name) => ({ name }));

  const PAGE = 500;
  const MAX_PAGES = 200; // 100k rows ceiling; guards against a cursor bug
  const all = [];
  let cursor = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params =
      `select=name,oracle_id,type_line,image_url,updated_at` +
      `&image_url=not.is.null&type_line=not.is.null` +
      `&order=oracle_id.asc&limit=${PAGE}` +
      (cursor ? `&oracle_id=gt.${encodeURIComponent(cursor)}` : '');

    const rows = await fetchWithRetry(`${SUPABASE_URL}/rest/v1/cards?${params}`, {
      label: `cards page ${page} (after ${cursor ?? 'start'})`,
    });

    if (!Array.isArray(rows) || rows.length === 0) break;
    all.push(...rows);
    cursor = rows[rows.length - 1]?.oracle_id;
    if (!cursor || rows.length < PAGE) break;
  }
  return all;
}

function isIndexableCardRow(card) {
  return Boolean(
    card &&
      typeof card.name === 'string' &&
      typeof card.oracle_id === 'string' &&
      card.oracle_id.trim() &&
      typeof card.type_line === 'string' &&
      card.type_line.trim() &&
      typeof card.image_url === 'string' &&
      card.image_url.trim(),
  );
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

function urlEntry(path, lastmod) {
  const parts = [`<loc>${escapeXml(SITE_URL + path)}</loc>`];
  if (lastmod) parts.push(`<lastmod>${lastmod}</lastmod>`);
  return `  <url>${parts.join('')}</url>`;
}

function toLastmodDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

// No build-time `today` fallback: <lastmod> is emitted only from a real,
// page-specific timestamp. A generation-time date would make every URL look
// freshly modified on every deploy, which crawlers learn to ignore.


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

const pushUnique = (path, lastmod) => {
  if (!path || seen.has(path)) return;
  seen.add(path);
  lines.push(urlEntry(path, lastmod));
};

for (const p of STATIC_PATHS) {
  pushUnique(p, null);
}

for (const slug of GUIDE_SLUGS) {
  pushUnique(`/guides/${slug}`, null);
}

const landingPaths = await readIndexableLandingPaths();
if (landingPaths.length < MIN_EXPECTED_LANDING_PAGES) {
  console.error(
    `[sitemap] Only ${landingPaths.length} indexable landing pages found ` +
      `(expected >= ${MIN_EXPECTED_LANDING_PAGES}) — refusing to drop landing coverage.`,
  );
  process.exit(1);
}
for (const path of landingPaths) {
  pushUnique(path, null);
}

for (const row of curated) {
  pushUnique(`/search/${row.slug}`, toLastmodDate(row.updated_at));
}

for (const row of seoPages) {
  pushUnique(`/ai/${row.slug}`, toLastmodDate(row.updated_at));
}

/**
 * Slugs that scripts/prerender-cards.mjs will emit static HTML for. Returns
 * null when the snapshot is unreadable so the sitemap degrades to full
 * coverage rather than losing card URLs entirely.
 */
async function readPrerenderedCardSlugs() {
  try {
    const raw = await fs.readFile('scripts/data/prerender-cards.json', 'utf8');
    const parsed = JSON.parse(raw);
    const limit = Number(process.env.PRERENDER_CARD_LIMIT ?? 5000);
    const slugs = new Set();
    for (const card of Array.isArray(parsed?.cards) ? parsed.cards : []) {
      if (slugs.size >= limit) break;
      const slug = typeof card?.name === 'string' ? slugifyCardName(card.name) : '';
      if (slug) slugs.add(slug);
    }
    return slugs.size > 0 ? slugs : null;
  } catch {
    return null;
  }
}



// Only list card URLs that the postbuild prerenderer actually writes a static
// document for. Everything beyond that cap ships as the bare SPA shell, and a
// sitemap full of identical shells is what Semrush reports as "incorrect pages
// found in sitemap.xml" (and Google as "duplicate without user-selected
// canonical"). The prerender snapshot is the single source of truth for which
// slugs have real HTML.
const prerenderedSlugs = await readPrerenderedCardSlugs();
if (prerenderedSlugs) {
  console.log(
    `[sitemap] Limiting card URLs to ${prerenderedSlugs.size} prerendered slugs.`,
  );
}

for (const card of cards) {
  if (!isIndexableCardRow(card)) continue;
  const slug = slugifyCardName(card.name);
  if (!slug) continue;
  if (prerenderedSlugs && !prerenderedSlugs.has(slug)) continue;
  pushUnique(`/cards/${slug}`, toLastmodDate(card.updated_at));
}



const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  lines.join('\n') +
  `\n</urlset>\n`;

// Safety net: never replace a rich committed sitemap with a stub because the
// build environment happened to lack Supabase credentials.
if (!HAS_SUPABASE) {
  let existingUrls = 0;
  try {
    const existing = await fs.readFile(OUTPUT, 'utf8');
    existingUrls = (existing.match(/<loc>/g) ?? []).length;
  } catch {
    /* no existing sitemap */
  }
  if (existingUrls > seen.size && !prerenderedSlugs) {
    console.warn(
      `[sitemap] No Supabase env; keeping existing sitemap with ` +
        `${existingUrls} URLs instead of writing ${seen.size}.`,
    );
    process.exit(0);
  }
}

await fs.writeFile(OUTPUT, xml, 'utf8');

console.log(
  `[sitemap] Wrote ${seen.size} URLs ` +
    `(cards=${cards.length}, search=${curated.length}, ai=${seoPages.length}, ` +
    `guides=${GUIDE_SLUGS.length}, landing=${landingPaths.length}, ` +
    `static=${STATIC_PATHS.length}, ` +
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
