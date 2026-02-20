# Project Status

## What this is

OffMeta is a natural-language search frontend for Magic: The Gathering cards. It translates plain-English queries into Scryfall search syntax using backend edge functions and returns card results in a React 19 + Vite UI.

## How to run

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment template and fill in required values:
   ```bash
   cp .env.example .env
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```

## Known gaps / TODO

- Schedule `cleanup-logs` as a nightly cron at 02:00 UTC (companion to `generate-patterns-nightly`) to enforce the 30-day `translation_logs` retention window before pattern promotion runs.
- Add a formal FK constraint from `search_feedback.generated_rule_id` to `translation_rules.id` with `ON DELETE SET NULL` to enforce referential integrity at the database level.

## Recent additions

- **Feedback auto-repair pipeline**: `process-feedback` edge function processes each user-submitted correction through Gemini 2.5 Flash Lite, generates a linked `translation_rules` row, and transitions the feedback row through `pending → processing → completed`. Fixed a 401 rejection that prevented anon callers from triggering the pipeline (`verify_jwt = false` added to config).
- **Nightly pattern promotion** (`generate-patterns-nightly`): pg_cron job registered at 03:00 UTC. Scans the last 30 days of `translation_logs`, promotes queries with ≥3 occurrences and ≥0.8 confidence into `translation_rules` (up to 50 per run, with deduplication).
- **Admin feedback queue panel**: Upgraded feedback section in the admin analytics dashboard — full pipeline status badges (pending/processing/completed/failed/skipped/duplicate/updated_existing), inline AI-generated `translation_rules` display (pattern, Scryfall syntax, confidence), and one-click approve/reject toggle.
- **About Page** (`/about`): Cinematic 7-phase product story with animated stat counters, staggered scroll-reveal phase timeline, Evolution Arc milestone visualizer, and Phase 7 teaser cards. Includes BreadcrumbList JSON-LD, OG/Twitter meta tags, and a typewriter tagline cycling "Find the card. / Build the deck. / Discover the combo."
- **Structured data (JSON-LD)**: BreadcrumbList schemas added to `/about`, `/docs`, `/combos`, `/deck-recs`, and `/archetypes`. `/guides` and individual guide pages already had breadcrumbs. All schemas mount/unmount cleanly via `useEffect`.
- **i18n**: `header.about` key added across all 11 language files (en, de, es, fr, it, pt, ja, ko, ru, zh-Hans, zh-Hant). About page nav link is fully localized.
- **Mobile-First Responsive Design**: Standardized spacing system with progressive scaling across mobile (390px), tablet (768px), and desktop (1280px+). Overflow protection on all pages.
- **Home Discovery Section**: Dedicated section with Recent Searches, Features Showcase (moved above Daily Pick), Daily Pick, Staples, How It Works, and FAQ.
- **Deck Recommendations** (`/deck-recs`): AI-powered card suggestions via Moxfield import or text paste. Categorized by High Synergy, Upgrades, and Budget Picks with Commander legality enforcement.
- **Combo Finder** (`/combos`): Discover card combos for any commander with prerequisites, steps, and pricing. Accessible from top navigation.
- **Commander Archetypes** (`/archetypes`): Browse popular archetypes with curated card lists.
- **Features Showcase**: Landing page section highlighting all core tools with direct navigation links.
- **Alchemy Exclusion**: All Scryfall queries automatically exclude rebalanced digital-only cards (`-is:rebalanced`).
- **Footer Attribution**: Powered by Scryfall, Moxfield, and Commander Spellbook with external links.
- **Search Guides**: 10 progressive guides (`/guides`) teaching natural language search from basic to expert.
- **Card Comparison**: Side-by-side comparison of 2–4 cards.
- **View Modes**: Grid, list, and image-only views with persistent preference.
- **Export Results**: Copy card names or download CSV.
- **Staples Section**: Archetype quick-search chips on home page.
- **Cross-page Navigation**: Hash links work from any page (navigate home + scroll).
- **Security Suite**: 300+ security tests covering injection, CORS, ReDoS, prototype pollution, and timing attacks.
- **Regression Suite**: 70+ regression tests across caching, virtualization, and analytics.
- **Internationalization**: Full i18n with 11 languages covering UI strings and all 10 search guide pages (intro, tips, FAQ).
- **Accessibility**: WCAG 2.1 AA — skip links, focus trap on mobile nav, ARIA live regions, roving tab index for card grids, reduced-motion support for all animations.
