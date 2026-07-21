// Generates static per-card HTML at public/cards/<slug>/index.html for the top-N
// popular cards. Lovable static hosting serves matching files before falling back
// to the SPA index.html, so crawlers (and social scrapers that don't run JS) see
// card-specific <title>, <meta description>, <h1>, and oracle text.
//
// Runs via `prebuild`. Failures degrade gracefully — the SPA shell continues to
// render the same page client-side via React Router.

import fs from 'node:fs/promises';
import path from 'node:path';

const SITE_URL = 'https://offmeta.app';
const OUTPUT_DIR = 'public/cards';
const MAX_CARDS = Number(process.env.PRERENDER_CARD_LIMIT ?? 300);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
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

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function truncate(str, max) {
  if (!str) return '';
  return str.length <= max ? str : str.slice(0, max - 1).trimEnd() + '…';
}

async function pgrest(pathAndQuery) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!resp.ok) return null;
  return resp.json();
}

async function fetchTopCards(limit) {
  const signals = await pgrest(
    `card_signals?select=card_id,trend_score,search_count&order=trend_score.desc.nullslast,search_count.desc.nullslast&limit=${limit}`,
  );
  if (!Array.isArray(signals) || signals.length === 0) return [];

  const ids = signals.map((s) => s.card_id).filter(Boolean);
  if (ids.length === 0) return [];

  const CHUNK = 100;
  const cardByOracleId = new Map();
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const inList = chunk.map((id) => `"${id}"`).join(',');
    const rows = await pgrest(
      `cards?select=oracle_id,name,mana_cost,type_line,oracle_text,colors,image_url,rarity,legalities&oracle_id=in.(${inList})`,
    );
    if (Array.isArray(rows)) {
      for (const row of rows) cardByOracleId.set(row.oracle_id, row);
    }
  }

  return ids
    .map((id) => cardByOracleId.get(id))
    .filter((row) => row && typeof row.name === 'string' && row.name.length > 1);
}

function buildTitle(name) {
  const long = `Cards Like ${name} — Similar MTG Picks (2026) | OffMeta`;
  const mid = `Cards Like ${name} — Similar MTG Picks | OffMeta`;
  const short = `Cards Like ${name} | OffMeta`;
  if (long.length <= 60) return long;
  if (mid.length <= 60) return mid;
  if (short.length <= 60) return short;
  return `${name} alternatives | OffMeta`;
}

function buildDescription(card) {
  const typeShort = (card.type_line || 'MTG card').split('—')[0].trim().toLowerCase();
  const base = `Cards like ${card.name}: 12+ similar ${typeShort} alternatives, off-meta picks, and synergies for Commander, Modern & Pauper.`;
  return truncate(base, 160);
}

function buildProductJsonLd(card, slug, canonicalUrl, image) {
  const additionalProperty = [];
  if (card.rarity) additionalProperty.push({ '@type': 'PropertyValue', name: 'Rarity', value: card.rarity });
  if (card.mana_cost) additionalProperty.push({ '@type': 'PropertyValue', name: 'Mana Cost', value: card.mana_cost });

  const oracleSnippet = truncate(card.oracle_text || '', 240);
  const richDesc = oracleSnippet
    ? `${card.name} is a ${card.type_line ?? 'Magic: The Gathering card'}. ${oracleSnippet}`
    : `${card.name} — ${card.type_line ?? 'Magic: The Gathering card'}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: card.name,
    description: richDesc,
    image,
    url: canonicalUrl,
    brand: { '@type': 'Brand', name: 'Magic: The Gathering' },
    category: card.type_line ?? '',
    ...(additionalProperty.length > 0 && { additionalProperty }),
  };
}

function buildHtml(card, slug) {
  const canonicalUrl = `${SITE_URL}/cards/${slug}`;
  const title = buildTitle(card.name);
  const description = buildDescription(card);
  const image = card.image_url || `${SITE_URL}/og-image.png`;
  const jsonLd = JSON.stringify(buildProductJsonLd(card, slug, canonicalUrl, image));

  const legalFormats = card.legalities && typeof card.legalities === 'object'
    ? Object.entries(card.legalities)
        .filter(([, v]) => v === 'legal')
        .map(([k]) => k)
    : [];

  const oracleParagraphs = (card.oracle_text || '')
    .split(/\n+/)
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('\n        ');

  // Root div stays empty for hydration — client bundle takes over. Prerendered
  // <article> lives inside <noscript> for crawlers and non-JS scrapers so it
  // never conflicts with React's mount point.
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <meta name="robots" content="index, follow" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="OffMeta" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />

  <script type="application/ld+json">${jsonLd}</script>

  <link rel="icon" type="image/svg+xml" href="${SITE_URL}/favicon.svg" />
  <link rel="stylesheet" href="/src/index.css" />
  <script type="module" src="/src/main.tsx"></script>
</head>
<body>
  <div id="root"></div>
  <noscript>
    <article>
      <h1>${escapeHtml(card.name)}</h1>
      ${card.type_line ? `<p><strong>Type:</strong> ${escapeHtml(card.type_line)}</p>` : ''}
      ${card.mana_cost ? `<p><strong>Mana Cost:</strong> ${escapeHtml(card.mana_cost)}</p>` : ''}
      ${card.rarity ? `<p><strong>Rarity:</strong> ${escapeHtml(card.rarity)}</p>` : ''}
      ${oracleParagraphs}
      ${legalFormats.length > 0 ? `<p><strong>Legal in:</strong> ${escapeHtml(legalFormats.join(', '))}</p>` : ''}
      <p><a href="${escapeHtml(canonicalUrl)}">Open ${escapeHtml(card.name)} on OffMeta</a></p>
    </article>
  </noscript>
</body>
</html>
`;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('[prerender-cards] Skipping — VITE_SUPABASE_URL / key not set.');
    return;
  }

  const cards = await fetchTopCards(MAX_CARDS);
  if (cards.length === 0) {
    console.warn('[prerender-cards] No cards returned from card_signals; skipping.');
    return;
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  let written = 0;
  const writtenSlugs = new Set();
  for (const card of cards) {
    const slug = slugifyCardName(card.name);
    if (!slug || writtenSlugs.has(slug)) continue;
    writtenSlugs.add(slug);

    const dir = path.join(OUTPUT_DIR, slug);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'index.html'), buildHtml(card, slug), 'utf8');
    written += 1;
  }

  console.log(`[prerender-cards] Wrote ${written} card HTML files to ${OUTPUT_DIR}/<slug>/index.html`);
}

main().catch((err) => {
  console.error('[prerender-cards] Failed:', err);
  // Never break the build — the SPA shell still serves the page.
  process.exit(0);
});
