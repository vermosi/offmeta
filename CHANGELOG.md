# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Soft-delete / archive for Translation Rules**: `translation_rules` now supports `archived_at`, plus active-only indexing and admin UI controls (Archive/Restore, Show archived toggle, archived-count badge, empty state) while preserving full audit history.
- **Security hardening migration**: Tightened `search_feedback` service-role RLS policy and added `WITH CHECK` to `deck_cards` UPDATE policy to block ownership-reassignment payloads.
- **Standalone Translation Rules panel** in `/admin` with filtering, confidence/status indicators, source-feedback deep links, and optimistic activate/deactivate toggles.
- **Real-time admin analytics sync** for `search_feedback` and `translation_rules` INSERT/UPDATE events, including inline generated-rule hydration when `generated_rule_id` is set.
- **Semantic design tokens**: Added `--success` and `--warning` tokens (light/dark + Tailwind mapping) and replaced hardcoded status palette usage in admin UI.
- **Admin RLS policy for `translation_rules` UPDATE** allowing authenticated admins to toggle `is_active` safely (`USING` + `WITH CHECK` via `public.has_role`).
- **Foreign key integrity**: Added `fk_search_feedback_generated_rule` (`ON DELETE SET NULL`) for `search_feedback.generated_rule_id`.
- **Pattern-promotion automation improvements**: Lowered `MIN_OCCURRENCES` (3 → 2), enforced `MIN_RESULT_COUNT = 1`, and recorded both thresholds in generated rule descriptions.
- **Scheduled automation via `pg_cron` + `pg_net`**: Added nightly log cleanup (02:00 UTC) and nightly pattern promotion (03:00 UTC).
- **Admin feedback queue upgrades**: Added full pipeline statuses, inline generated rule details, approve/reject toggle, and retry actions for failed/skipped items.
- **About page (`/about`)**: Added a 7-phase product story with animated counters, scroll-reveal timeline, Evolution Arc milestones, and teaser cards.
  - Includes BreadcrumbList JSON-LD, canonical/OG/Twitter metadata, and keyboard accessibility improvements (`<main id="main-content">`, skip link).
  - Added `useTypewriterCycle` hook for always-on rotating tagline copy with `prefers-reduced-motion` support.
  - Added `header.about` translations across all supported locales and added `/about` to `sitemap.xml`.
- **Deck editor experience**:
  - Multi-board support (mainboard, sideboard, maybeboard, commander/companion).
  - Four view modes (list, visual grid, pile, stats).
  - AI categorization (`deck-categorize`) and AI suggestions (`deck-suggest`).
  - Inline combo detection (`combo-search`), print/set picker, real-time USD estimate, Moxfield/text import, and export options.
  - Smart Search toggle, format-aware deck-size enforcement, auto-save notes, keyboard shortcuts, and public sharing.
- **New discovery/tools surfaces**: Combo Finder (`/combos`), Deck Recommendations (`/deck-recs`), Commander Archetypes (`/archetypes`), Features Showcase, and Staples quick-search section.
- **Guides expansion**: Added `/guides` index plus 10 progressive guides with per-guide SEO metadata and breadcrumbs.

### Changed

- **Deck editor architecture**: Refactored monolithic `DeckEditor.tsx` into focused deckbuilder modules and shared helpers/hooks for maintainability.
- Standardized section and page spacing across home and guides for improved layout consistency.
- Tightened hero/discovery spacing and reordered landing sections (Features Showcase now above Daily Pick).
- Updated header/navigation behavior for cross-page hash scrolling and direct links to Combos, Deck Recs, and Guides index.
- Improved search responsiveness by making log flushing non-blocking and reducing identical-query cooldown from 2s to 500ms.
- Standardized scripts/lint/format tooling, improved fetch reliability with retries/timeouts, and switched license to AGPL-3.0.

### Fixed

- `process-feedback` 401s for unauthenticated feedback submissions by updating Supabase function JWT gateway config.
- Authenticated-user 401s on edge functions caused by JWT `iss` mismatch in `validateAuth`.
- Horizontal overflow and narrow-screen layout issues across mobile pages.
- Cross-page hash navigation regressions (Daily Pick, FAQ, How It Works).
- Deterministic translation edge cases (mana production/color identity) and Alchemy rebalanced-card leakage in results.
- Fast-refresh violations by extracting shared deckbuilder constants/caches from component files.
- Lint/runtime issues in deckbuilder and search modules (`PileView` expression cleanup, `console.*` removal, `DeckCombos` callback deps, unused import removal).
