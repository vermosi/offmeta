# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Soft-delete / archive for Translation Rules**: `translation_rules` table now has an `archived_at TIMESTAMPTZ` column (default `NULL`). Active rules have `archived_at IS NULL`; archived rules carry a timestamp. A partial index `WHERE archived_at IS NULL` keeps active-rule queries fast. The admin Translation Rules panel gains: an **Archive** / **Restore** button per row, a **Show archived** toggle in the header, and archived-count badge, and a structured empty state. Full audit trail is preserved — archived rows are never deleted from the database. The `confidence` column was also tightened to `NOT NULL DEFAULT 0.8`. Accompanying indexes added: `idx_translation_rules_source_feedback_id`, `idx_search_feedback_status`, `idx_search_feedback_created`.

- **Security hardening (migration)**: The `service_role_all_feedback` RLS policy on `search_feedback` was narrowed from `USING (true)` to `USING (auth.role() = 'service_role')` to match the explicit pattern used on all other service-role policies. The `deck_cards` UPDATE policy gained a `WITH CHECK` clause mirroring its `USING` expression, preventing a crafted payload from reassigning a card to a deck the user doesn't own.

- **Standalone Translation Rules management panel**: New section in the admin analytics dashboard (`/admin`) showing the full `translation_rules` table — pattern, Scryfall syntax, confidence badge, active/inactive dot indicator, creation date, and a source-feedback deep link that scrolls and expands the originating feedback row. Includes pattern/syntax/description text filter, active/all/inactive dropdown filter, and Activate/Deactivate toggles with optimistic updates. Both panels (rules + feedback) stay in sync via a shared realtime subscription.

- **Real-time feedback queue updates**: The admin analytics channel (`admin-analytics-realtime`) now subscribes to `search_feedback` INSERT and UPDATE events. New submissions appear at the top of the queue without a manual refresh; status transitions from `process-feedback` (e.g. `pending → processing → completed`) patch existing rows in-place. When `generated_rule_id` is populated by an UPDATE, the component fires a targeted single-row join fetch to hydrate the inline rule box with the full `translation_rules` object.

- **Real-time translation_rules sync**: The same realtime channel also subscribes to `translation_rules` INSERT and UPDATE events. New rules are prepended to the standalone panel; UPDATE events (e.g. `is_active` toggle from either panel) are merged into both the rules table and the feedback queue simultaneously, keeping both views consistent without a full refetch.

- **Semantic design tokens — `--success` and `--warning`**: Added to `src/index.css` as HSL variables in both light and dark modes, and registered in `tailwind.config.ts` as `success` and `warning` color keys. Used across the admin dashboard for: active-rule status dots, high-confidence badges (≥80%), live indicator pulse, and completed/updated_existing status badges (`--success`); medium-confidence badges (60–79%), alert icons, and processing-status indicators (`--warning`). This replaces all previous hardcoded `green-*` / `amber-*` / `red-*` palette classes with semantic tokens that correctly follow the active theme.

- **Admin RLS — `translation_rules` UPDATE policy**: Added `Admins can update translation_rules` policy so authenticated users with the `admin` role can flip `is_active` directly from the client, complementing the existing service-role-only write policies. Uses `public.has_role(auth.uid(), 'admin')` in both the USING and WITH CHECK expressions to prevent privilege escalation.

- **FK constraint `fk_search_feedback_generated_rule`**: `search_feedback.generated_rule_id → translation_rules.id ON DELETE SET NULL` — orphaned rule references are automatically nulled when a rule is deleted, enforcing referential integrity at the database level.

- **Pattern promotion thresholds tightened**: `generate-patterns` `MIN_OCCURRENCES` lowered from 3 → 2 to catch faster-rising patterns; new `MIN_RESULT_COUNT = 1` guard added to both the DB query filter and the candidate filter so only queries that returned ≥1 Scryfall result are ever promoted, eliminating zero-result noise in `translation_rules`. Rule `description` now records both occurrence count and minimum result count.
- **Nightly log cleanup** (`cleanup-logs-nightly`): `pg_cron` job registered at 02:00 UTC daily via `pg_net.http_post`. Deletes `translation_logs` and `analytics_events` rows older than 30 days; ensures the pattern-promotion window is always clean when `generate-patterns` fires at 03:00 UTC.
- **Nightly pattern promotion** (`generate-patterns-nightly`): `pg_cron` job registered at 03:00 UTC daily via `pg_net.http_post`. Scans the last 30 days of `translation_logs`, promotes qualifying queries into `translation_rules` (up to 50 per run), and skips patterns that already have a matching rule.
- **Admin feedback queue panel**: Upgraded feedback section in the analytics dashboard with full pipeline status visibility (pending / processing / completed / failed / skipped / duplicate / updated_existing), inline display of the AI-generated `translation_rules` row (pattern, Scryfall syntax, confidence), one-click approve/reject toggle on `translation_rules.is_active`, and a re-trigger button for failed/skipped items.
- **`pg_cron` + `pg_net` extensions**: Enabled via idempotent migration (`create extension if not exists`) required for scheduled HTTP calls from the database.

### Fixed

- **`process-feedback` 401**: Added `verify_jwt = false` to `supabase/config.toml` so anon and unauthenticated callers can submit feedback corrections without receiving a JWT rejection from the Supabase gateway.



- **About Page** (`/about`): Cinematic 7-phase product story. Features animated stat counters, staggered IntersectionObserver scroll-reveal phase timeline, Evolution Arc milestone block, and Phase 7 teaser cards. Includes BreadcrumbList JSON-LD, OG/Twitter meta tags, canonical tag, and a `useTypewriterCycle` hook cycling "Find the card. / Build the deck. / Discover the combo." with `prefers-reduced-motion` support.
- **`useTypewriterCycle` hook**: Reusable always-on cycling typewriter hook (distinct from the session-gated search bar animation). Respects `prefers-reduced-motion`.
- **JSON-LD BreadcrumbList schemas**: Added to `/about`, `/docs`, `/combos`, `/deck-recs`, `/archetypes`. Mount/unmount cleanly via `useEffect` with no DOM leaks.
- **i18n — `header.about`**: Added to all 11 language files (en, de, es, fr, it, pt, ja, ko, ru, zh-Hans, zh-Hant).
- **a11y — `/about`**: Added `<main id="main-content">` and a visible-on-focus skip link for keyboard navigation.
- **`sitemap.xml`**: Added `/about` entry (`priority 0.8`, `changefreq monthly`).

  - Multi-board support: Mainboard, Sideboard, Maybeboard, and Commander/Companion slots
  - Four view modes: List (by category), Visual (image grid), Pile (color columns), Stats bar
  - AI-powered functional categorization via `deck-categorize` edge function (Gemini Flash)
  - AI card suggestions via `deck-suggest` edge function, ranked by priority
  - Inline combo detection via `combo-search` (Commander Spellbook), auto-fires at 10+ cards with "Almost There" combos
  - Printing/set picker with lazy Scryfall fetch and per-print USD prices
  - Real-time USD price estimate aggregated via Scryfall `/cards/collection` API
  - Moxfield URL import and plain-text decklist import
  - Export: copy card names, download CSV, copy as text list
  - Smart Search toggle for natural-language card search within the editor
  - Format selector with deck-size enforcement (Commander=100, Standard=60, etc.)
  - Auto-save deck notes field
  - Keyboard shortcuts (Del to remove, Shift+S to sideboard)
  - Public deck sharing (read-only view for unauthenticated visitors)
- **DeckEditor refactor**: Split monolithic `DeckEditor.tsx` (~1600 lines) into 14 focused modules in `src/components/deckbuilder/` and `src/lib/deckbuilder/` for maintainability.
  - `constants.ts` — shared caches and CATEGORIES array (fixes Vite fast-refresh)
  - `CardHoverImage.tsx`, `CardSearchPanel.tsx`, `CardPreviewPanel.tsx`
  - `CategorySection.tsx`, `SideboardSection.tsx`, `MaybeboardSection.tsx`
  - `VisualCardGrid.tsx`, `PileView.tsx`, `PrintingPickerPopover.tsx`
  - `SuggestionsPanel.tsx`, `DeckCombos.tsx`
  - `src/hooks/useDeckPrice.ts` — mainboard USD price hook
  - `src/lib/deckbuilder/sort-deck-cards.ts` — sort by name/CMC/color/type/price
  - `src/lib/deckbuilder/infer-category.ts` — rule-based category inference from type line
- **Auth fix**: Edge function JWT validator (`_shared/auth.ts`) now correctly accepts authenticated user tokens (`iss: 'https://...supabase.co/auth/v1'`) in addition to anon tokens (`iss: 'supabase'`). Previously, all logged-in users received 401 errors from all edge functions.
- **Search performance**: Non-blocking log flushing — `flushLogQueue()` is now fire-and-forget, removing it from the response-path critical chain.
- **Search UX**: Removed redundant "Search translated" success toast; reduced identical-query cooldown from 2s to 500ms.
- Mobile-first responsive design with standardized spacing system across all pages and sections.
- Home discovery section component (`HomeDiscoverySection`) grouping pre-search content.
- How It Works section with 4-step visual guide on the home page.
- Overflow protection (`overflow-x: hidden`) on HTML root and all page wrappers.
- 10 progressive search guides (`/guides`) from beginner to expert difficulty.
- Guides index page with visual cards, difficulty badges, and example queries.
- Individual guide pages with SEO metadata, JSON-LD structured data, and breadcrumbs.
- Card comparison view for side-by-side stat comparison (2–4 cards).
- Multiple view modes: grid, list, and image-only with persistent preference.
- Export results: copy card names or download CSV.
- Staples section on home page with archetype quick-search chips.
- Cross-page header navigation: hash links (Daily Pick, FAQ, How It Works) work from any page.
- **Combo Finder** (`/combos`): Discover card combos for any commander via Commander Spellbook.
- **Deck Recommendations** (`/deck-recs`): AI-powered card suggestions via Moxfield import or text paste. Categorized by High Synergy, Upgrades, and Budget Picks.
- **Commander Archetypes** (`/archetypes`): Browse popular archetypes with curated card lists and quick-search.
- **Features Showcase**: Landing page section highlighting all core tools with direct navigation.
- Footer attribution for Scryfall, Moxfield, and Commander Spellbook.
- Alchemy rebalanced card exclusion (`-is:rebalanced`) applied to all Scryfall queries.
- OSS documentation, contribution, and governance guides.
- CI workflow and Dependabot configuration.
- Runtime environment validation and example configuration.
- Expanded tests and coverage thresholds.
- Trademark/branding guidelines for forks.

### Changed

- Standardized section padding to `py-10 sm:py-14 lg:py-16` across How It Works, FAQ, and similar sections.
- Standardized main content padding to `py-8 sm:py-10 lg:py-12` across guide pages.
- Tightened hero section spacing and discovery section gaps for improved UX flow.
- Reordered landing page sections: Features Showcase now appears above Daily Pick.
- Header component now uses `useNavigate` and `useLocation` for cross-page hash scrolling.
- Header nav includes Combos and Deck Recs links for direct access.
- Guide pages use shared Header component instead of inline headers.
- Guides link in nav updated from single guide to `/guides` index.
- Standardized scripts, linting, and formatting tooling.
- Improved external fetch reliability with timeouts/retries.
- Switched the project license to AGPL-3.0.

### Fixed

- **Critical**: Authenticated users receiving 401 from all edge functions due to JWT `iss` mismatch in `validateAuth`.
- Horizontal overflow on mobile viewports across all pages.
- Guide page button text wrapping causing layout break on narrow screens.
- Hash navigation (Daily Pick, FAQ, How It Works) now works from non-home pages.
- Deterministic translation edge cases for mana production and color identity.
- Alchemy rebalanced cards (e.g., "A-Omnath") no longer appear in search results.
- Fast-refresh violations: `CATEGORIES`, `cardImageFetchCache`, and `printingsByName` extracted from component files to `constants.ts`.
- PileView: nullish-coalescing expression replaced with explicit conditional to satisfy `@typescript-eslint/no-unused-expressions`.
- `useDeckPrice` and `DeckBuilder.tsx`: replaced `console.*` calls with silent error swallowing per `no-console` rule.
- `DeckCombos`: stabilised `useCallback` dependency array using pre-computed key strings.
- `semantic-search/index.ts`: removed unused `validateAndRelaxQuery` import.
