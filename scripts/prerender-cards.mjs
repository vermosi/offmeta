// Postbuild: generates per-card static HTML at dist/cards/<slug>/index.html for
// the top-N popular cards. Each file:
//   - reuses the built index.html (with correct hashed script/link tags) so
//     humans landing directly get the full SPA
//   - swaps <title>, meta description, canonical, og:*, twitter:*, and JSON-LD
//     to be card-specific so crawlers and social scrapers see the right thing
//   - embeds <h1> + oracle text inside <noscript> for non-JS crawlers
//
// Lovable static hosting serves files that match the request path before
// falling back to the SPA index.html, so /cards/<slug>/ is served from the
// prerendered file when present.
//
// Runs via `postbuild`. Failures degrade gracefully — the SPA shell continues
// to render the same page client-side via React Router.

import fs from 'node:fs/promises';
import path from 'node:path';

const SITE_URL = 'https://offmeta.app';
const DIST_DIR = 'dist';
const OUTPUT_DIR = path.join(DIST_DIR, 'cards');
const MAX_CARDS = Number(process.env.PRERENDER_CARD_LIMIT ?? 5000);

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
  // 1) Prefer cards ranked by real engagement signals (trend / search volume).
  const signals = await pgrest(
    `card_signals?select=card_id,trend_score,search_count&order=trend_score.desc.nullslast,search_count.desc.nullslast&limit=${limit}`,
  );

  const cardByOracleId = new Map();
  const orderedIds = [];

  if (Array.isArray(signals) && signals.length > 0) {
    const ids = signals.map((s) => s.card_id).filter(Boolean);
    const CHUNK = 100;
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
    for (const id of ids) if (cardByOracleId.has(id)) orderedIds.push(id);
  }

  // 2) Backfill with the general cards table so we don't leave the long tail
  //    of /cards/* URLs (the ones Googlebot has been seeing as SPA shells)
  //    without a prerendered document. Paginates PostgREST's 1000-row cap.
  if (orderedIds.length < limit) {
    const remaining = limit - orderedIds.length;
    const PAGE = 1000;
    let offset = 0;
    while (orderedIds.length < limit) {
      const take = Math.min(PAGE, limit - orderedIds.length);
      const rows = await pgrest(
        `cards?select=oracle_id,name,mana_cost,type_line,oracle_text,colors,image_url,rarity,legalities&order=name.asc&limit=${take}&offset=${offset}`,
      );
      if (!Array.isArray(rows) || rows.length === 0) break;
      for (const row of rows) {
        if (!row?.oracle_id || cardByOracleId.has(row.oracle_id)) continue;
        cardByOracleId.set(row.oracle_id, row);
        orderedIds.push(row.oracle_id);
        if (orderedIds.length >= limit) break;
      }
      offset += rows.length;
      if (rows.length < take) break;
    }
    void remaining;
  }

  return orderedIds
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

function buildProductJsonLd(card, canonicalUrl, image) {
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

// Rewrites the built index.html <head> for a specific card and injects a
// <noscript> block with the h1/oracle text right after <body>.
function customizeHtmlForCard(templateHtml, card, slug) {
  const canonicalUrl = `${SITE_URL}/cards/${slug}`;
  const title = buildTitle(card.name);
  const description = buildDescription(card);
  const image = card.image_url || `${SITE_URL}/og-image.png`;
  const jsonLd = JSON.stringify(buildProductJsonLd(card, canonicalUrl, image));

  const legalFormats = card.legalities && typeof card.legalities === 'object'
    ? Object.entries(card.legalities)
        .filter(([, v]) => v === 'legal')
        .map(([k]) => k)
    : [];

  const oracleParagraphs = (card.oracle_text || '')
    .split(/\n+/)
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('');

  let html = templateHtml;

  // Replace <title>
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

  // Replace/insert meta description
  const descTag = `<meta name="description" content="${escapeHtml(description)}" />`;
  if (/<meta\s+name=["']description["'][^>]*>/i.test(html)) {
    html = html.replace(/<meta\s+name=["']description["'][^>]*>/i, descTag);
  } else {
    html = html.replace(/<\/head>/i, `${descTag}\n  </head>`);
  }

  // Strip existing canonical/og/twitter/JSON-LD from template so we can inject
  // card-specific ones cleanly.
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, '');
  html = html.replace(/<meta\s+property=["']og:[^"']+["'][^>]*>\s*/gi, '');
  html = html.replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>\s*/gi, '');
  html = html.replace(
    /<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi,
    '',
  );

  const seoBlock = `
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
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
  `;
  html = html.replace(/<\/head>/i, `${seoBlock}\n  </head>`);

  // Inject noscript with the card body — right after <body ...>
  const noscript = `
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
  `;
  html = html.replace(/<body([^>]*)>/i, `<body$1>${noscript}`);

  return html;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('[prerender-cards] Skipping — VITE_SUPABASE_URL / key not set.');
    return;
  }

  let templateHtml;
  try {
    templateHtml = await fs.readFile(path.join(DIST_DIR, 'index.html'), 'utf8');
  } catch (err) {
    console.warn('[prerender-cards] Skipping — dist/index.html not found:', err.message);
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

    const html = customizeHtmlForCard(templateHtml, card, slug);

    // Write both resolution paths so the static host serves prerendered HTML
    // regardless of whether it looks up "/cards/<slug>" or "/cards/<slug>/".
    const dir = path.join(OUTPUT_DIR, slug);
    await fs.mkdir(dir, { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(dir, 'index.html'), html, 'utf8'),
      fs.writeFile(path.join(OUTPUT_DIR, `${slug}.html`), html, 'utf8'),
    ]);
    written += 1;
  }

  console.log(
    `[prerender-cards] Wrote ${written} card HTML files to ${OUTPUT_DIR}/<slug>{.html,/index.html}`,
  );
}

main().catch((err) => {
  console.error('[prerender-cards] Failed:', err);
  // Never break the build — the SPA shell still serves the page.
  process.exit(0);
});
