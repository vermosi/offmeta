// Postbuild: generates per-route static HTML for the public, indexable static
// routes (plus every guide page) so crawlers and social scrapers that do not
// execute JavaScript see route-specific <title>, description, canonical and
// og:* tags instead of the homepage shell.
//
// Mirrors scripts/prerender-cards.mjs, which does the same job for /cards/*.
// Lovable static hosting serves a matching file before falling back to the SPA
// index.html, so /guides/ is served from the prerendered document when present.
//
// Failures degrade gracefully — the SPA continues to apply the same metadata
// client-side via src/lib/seo.ts.

import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';

const SITE_URL = 'https://offmeta.app';
const DIST_DIR = 'dist';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

/** Public routes that are safe to index. Excludes noindex/private routes. */
const STATIC_ROUTES = [
  {
    path: '/docs',
    title: 'OffMeta Docs — Search Syntax & API Reference',
    description:
      'Documentation for OffMeta: how plain-English card search works, the Scryfall syntax it generates, and the public card API.',
    heading: 'OffMeta documentation',
  },
  {
    path: '/docs/syntax',
    title: 'Scryfall Syntax Cheat Sheet for MTG Search | OffMeta',
    description:
      'Every Scryfall search operator OffMeta can generate: colors, types, mana value, price, legality, oracle tags and art tags, with examples.',
    heading: 'Scryfall syntax reference',
  },
  {
    path: '/guides',
    title: 'MTG Search Guides — Find Cards by What They Do | OffMeta',
    description:
      'Step-by-step guides for finding Magic cards by effect, tribe, budget and format — from simple type searches to layered Commander queries.',
    heading: 'MTG search guides',
  },
  {
    path: '/combos',
    title: 'Find My Combos — MTG Combo Finder | OffMeta',
    description:
      'Paste a decklist and find the combos it already contains, plus the missing pieces, filtered by price ceiling and format.',
    heading: 'Find my combos',
  },
  {
    path: '/deck-check',
    title: 'Deck Check — Spot Gaps in Your Commander Deck | OffMeta',
    description:
      'Check a Commander decklist for missing ramp, removal, card draw and interaction, then jump straight to searches that fill each gap.',
    heading: 'Deck check',
  },
  {
    path: '/browse-searches',
    title: 'Browse MTG Card Searches by Effect | OffMeta',
    description:
      'Browse curated Magic card searches: sacrifice outlets, budget tutors, treasure makers, board wipes and other common deckbuilding needs.',
    heading: 'Browse card searches',
  },
  {
    path: '/cards-like',
    title: 'Cards Like — Find Similar MTG Cards | OffMeta',
    description:
      'Find Magic cards that do the same job as a card you already know, including cheaper alternatives and off-meta substitutes.',
    heading: 'Find cards like',
  },
  {
    path: '/search-intents',
    title: 'MTG Search Intents — Budget, Hate & Similar Cards | OffMeta',
    description:
      'Common ways players search for Magic cards: budget replacements, strategy hate, and functionally similar alternatives.',
    heading: 'Search intents',
  },
  {
    path: '/search-intents/budget',
    title: 'Budget MTG Alternatives — Cheaper Card Swaps | OffMeta',
    description:
      'Find cheaper Magic cards that do the same thing as expensive staples, with price ceilings and format legality applied.',
    heading: 'Budget alternatives',
  },
  {
    path: '/search-intents/hate',
    title: 'MTG Hate Cards — Answers to Any Strategy | OffMeta',
    description:
      'Find hate pieces and answers for graveyards, artifacts, enchantments, tokens, combo and other strategies you keep losing to.',
    heading: 'Strategy hate cards',
  },
  {
    path: '/search-intents/similar',
    title: 'Similar MTG Cards — Functional Reprints & Swaps | OffMeta',
    description:
      'Find Magic cards that play like the one you have in mind: near-functional reprints, close effects and role replacements.',
    heading: 'Similar cards',
  },
  {
    path: '/scryfall-alternative',
    title: 'Scryfall Alternative — Search MTG Cards in Plain English',
    description:
      'OffMeta is a Scryfall alternative that turns plain English into Scryfall syntax, so you can find cards without memorising operators.',
    heading: 'A plain-English alternative to Scryfall syntax',
  },
  {
    path: '/about',
    title: 'About OffMeta — Plain-English MTG Card Search',
    description:
      'OffMeta turns what you describe into a Scryfall query and shows why each card matches. Built for Commander players and brewers.',
    heading: 'About OffMeta',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy | OffMeta',
    description: 'How OffMeta collects, uses and stores data, including analytics and account information.',
    heading: 'Privacy policy',
  },
  {
    path: '/terms',
    title: 'Terms of Service | OffMeta',
    description: 'The terms that apply when you use OffMeta’s Magic: The Gathering card search and related tools.',
    heading: 'Terms of service',
  },
];

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
  return str.length <= max ? str : `${str.slice(0, max - 1).trimEnd()}…`;
}

/** Transpiles src/data/guides.ts and reads the guide metadata out of it. */
async function loadGuideRoutes() {
  const outfile = path.join('node_modules', '.cache', 'prerender-guides.mjs');
  try {
    await build({
      entryPoints: ['src/data/guides.ts'],
      outfile,
      bundle: true,
      format: 'esm',
      platform: 'node',
      logLevel: 'silent',
    });
    const mod = await import(`${path.resolve(outfile)}?t=${Date.now()}`);
    const guides = Array.isArray(mod.GUIDES) ? mod.GUIDES : [];
    return guides
      .filter((g) => g?.slug && g?.metaTitle && g?.metaDescription)
      .map((g) => ({
        path: `/guides/${g.slug}`,
        title: truncate(g.metaTitle, 60),
        description: truncate(g.metaDescription, 160),
        heading: g.heading || g.title,
        body: g.intro,
      }));
  } catch {
    return [];
  }
}

function buildJsonLd(route, canonicalUrl) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: route.title,
    description: route.description,
    url: canonicalUrl,
    isPartOf: { '@type': 'WebSite', name: 'OffMeta', url: SITE_URL },
  });
}

function customizeHtmlForRoute(templateHtml, route) {
  const canonicalUrl = `${SITE_URL}${route.path}`;
  const title = route.title;
  const description = route.description;

  let html = templateHtml;

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

  const descTag = `<meta name="description" content="${escapeHtml(description)}" />`;
  if (/<meta\s+name=["']description["'][^>]*>/i.test(html)) {
    html = html.replace(/<meta\s+name=["']description["'][^>]*>/i, descTag);
  } else {
    html = html.replace(/<\/head>/i, `${descTag}\n  </head>`);
  }

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
    <meta property="og:locale" content="en_US" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${escapeHtml(DEFAULT_IMAGE)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(DEFAULT_IMAGE)}" />
    <script type="application/ld+json">${buildJsonLd(route, canonicalUrl)}</script>
  `;
  html = html.replace(/<\/head>/i, `${seoBlock}\n  </head>`);

  // The shell ships a homepage <h1> inside #seo-content; strip it so each
  // prerendered route has exactly one h1 — its own.
  html = html.replace(
    /<!--[\s\S]*?Static indexable content for SEO crawlers[\s\S]*?-->\s*/i,
    '',
  );
  html = html.replace(/<aside\b[^>]*id=["']seo-content["'][\s\S]*?<\/aside>\s*/i, '');

  const noscript = `
    <noscript>
      <article>
        <h1>${escapeHtml(route.heading)}</h1>
        <p>${escapeHtml(route.body || description)}</p>
        <p><a href="${escapeHtml(canonicalUrl)}">Open this page on OffMeta</a></p>
      </article>
    </noscript>
  `;
  html = html.replace(/<body([^>]*)>/i, `<body$1>${noscript}`);

  return html;
}

async function main() {
  let templateHtml;
  try {
    templateHtml = await fs.readFile(path.join(DIST_DIR, 'index.html'), 'utf8');
  } catch {
    console.warn('[prerender-static-routes] dist/index.html missing — skipping.');
    return;
  }

  const routes = [...STATIC_ROUTES, ...(await loadGuideRoutes())];
  let written = 0;

  for (const route of routes) {
    const html = customizeHtmlForRoute(templateHtml, route);
    const relative = route.path.replace(/^\//, '');
    const dir = path.join(DIST_DIR, relative);
    await fs.mkdir(dir, { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(dir, 'index.html'), html, 'utf8'),
      fs.writeFile(path.join(DIST_DIR, `${relative}.html`), html, 'utf8'),
    ]);
    written += 1;
  }

  console.log(
    `[prerender-static-routes] Wrote ${written} route HTML files to ${DIST_DIR}/<route>{.html,/index.html}`,
  );
}

main().catch((err) => {
  console.error('[prerender-static-routes] Failed:', err);
  process.exit(0);
});
