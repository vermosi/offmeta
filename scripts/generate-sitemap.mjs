import fs from 'node:fs/promises';

const SITE_URL = 'https://offmeta.app';
const OUTPUT = 'public/sitemap.xml';
const STATIC_PATHS = [
  '/', '/browse', '/deckbuilder', '/cards', '/guides', '/about', '/privacy', '/terms', '/contact',
];

function slugifyCardName(name) {
  return name
    .toLowerCase()
    .replace(/['.,]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function fetchPopularCardNames() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return ['Sol Ring','Rhystic Study','Swords to Plowshares','Counterspell','Cyclonic Rift'];

  const resp = await fetch(`${url}/rest/v1/translation_logs?select=translated_query&order=created_at.desc&limit=10000`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!resp.ok) return [];

  const rows = await resp.json();
  const counts = new Map();
  for (const row of rows) {
    const query = row.translated_query || '';
    for (const match of query.matchAll(/!"([^"]+)"/g)) {
      const card = match[1].trim();
      if (card.length < 2) continue;
      counts.set(card, (counts.get(card) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 1000)
    .map(([name]) => name);
}

function buildSitemap(paths) {
  const now = new Date().toISOString();
  const entries = paths.map((path) => `  <url><loc>${SITE_URL}${path}</loc><lastmod>${now}</lastmod></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

const popularCards = await fetchPopularCardNames();
const cardPaths = popularCards.map((name) => `/cards/${slugifyCardName(name)}`);
const xml = buildSitemap([...STATIC_PATHS, ...cardPaths]);
await fs.writeFile(OUTPUT, xml, 'utf8');
console.log(`Generated sitemap with ${STATIC_PATHS.length + cardPaths.length} URLs.`);
