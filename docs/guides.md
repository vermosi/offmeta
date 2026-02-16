# Search Guides

OffMeta includes 10 progressive search guides that teach users how to search for Magic: The Gathering cards using natural language, from basic type searches to expert-level multi-constraint queries.

## Overview

Guides are accessible at `/guides` and individual guides at `/guides/:slug`. They are pre-built content pages with SEO optimization, JSON-LD structured data, and internal linking.

## Architecture

### Data layer

All guide content lives in `src/data/guides.ts` as a typed `Guide[]` array. Each guide has:

| Field | Type | Description |
|-------|------|-------------|
| `slug` | string | URL-safe kebab-case identifier |
| `level` | number | Difficulty level (1–10) |
| `title` | string | Display title |
| `metaTitle` | string | SEO title (≤70 chars) |
| `metaDescription` | string | SEO description (≤170 chars) |
| `heading` | string | Page H1 |
| `subheading` | string | Subtitle |
| `intro` | string | Introductory paragraph |
| `searchQuery` | string | Natural language example |
| `translatedQuery` | string | Scryfall syntax output |
| `howOffmetaHelps` | string | Translation explanation |
| `tips` | string[] | Strategy tips (≥2) |
| `relatedGuides` | string[] | Slugs of related guides |
| `faq` | FAQ[] | Questions and answers (≥1) |

### Page components

- **`src/pages/GuidesIndex.tsx`** — Root index listing all 10 guides as cards
- **`src/pages/GuidePage.tsx`** — Individual guide detail page

Both pages use the shared `Header` component for consistent navigation.

### Routing

Routes are registered in `src/App.tsx`:

```tsx
<Route path="/guides" element={<GuidesIndex />} />
<Route path="/guides/:slug" element={<GuidePage />} />
```

## Difficulty Levels

| Levels | Label | Color | Topics |
|--------|-------|-------|--------|
| 1–3 | Beginner | Green | Type search, color filtering, price filters |
| 4–6 | Intermediate | Blue | Format legality, keywords, ramp/draw |
| 7–8 | Advanced | Amber | Tribal synergies, token/sacrifice |
| 9–10 | Expert | Purple | ETB/flicker combos, multi-constraint |

## SEO Features

Each guide page includes:

- Custom `<title>` and `<meta>` description
- Open Graph and Twitter Card meta tags
- Canonical URL
- JSON-LD `Article` structured data
- JSON-LD `FAQPage` structured data
- Breadcrumb navigation (Home / Guides / Title)

## Adding a New Guide

1. Add a new entry to `GUIDES` in `src/data/guides.ts`
2. Set the `level` field (must be unique)
3. Ensure `relatedGuides` reference existing slugs
4. Run tests: `npm run test -- src/data/__tests__/guides.test.ts`
5. The guide automatically appears on `/guides` and is routable at `/guides/:slug`

## Tests

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `src/data/__tests__/guides.test.ts` | 22 | Data integrity, SEO quality, slug validity, cross-references |
| `src/pages/__tests__/GuidesIndex.test.tsx` | 12 | Page rendering, card display, sorting, breadcrumbs |
| `src/pages/__tests__/GuidePage.test.tsx` | 31 | All 10 guides render, SEO metadata, JSON-LD, CTA navigation, 404 handling |

Run all guide tests:

```bash
npm run test -- guides
```

## Navigation Integration

The Header component (`src/components/Header.tsx`) includes a "Guides" link pointing to `/guides`. The Footer includes links to all individual guides.

Hash-based anchor links (Daily Pick, How It Works, FAQ) work correctly from guide pages — clicking them navigates to `/#hash` and scrolls to the target section after the home page renders.

## Localization

All guide content (titles, introductions, tips, FAQs) is fully translated into 11 languages. Translations use the `guide.{field}.{slug}` key convention in `src/lib/i18n/*.json`. See [i18n.md](i18n.md) for details on the translation system.
