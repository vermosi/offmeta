# Roadmap

Tracking format: `[Status: <planned|in progress|blocked|completed>] [Priority: <P0-P3>] [Discussion: <issue|milestone|owner>]`

## Completed

- Mobile-first responsive design with standardized spacing system (progressive padding/margins across breakpoints) — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- Home discovery section (Recent Searches, Curated Searches, FAQ) — analytics-driven cleanup removed low-engagement sections (Daily Pick, Features Showcase, How It Works, Trending Cards, Onboarding) — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- 10 progressive search guides (beginner → expert) with SEO optimization and JSON-LD — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- Card comparison view (compare 2–4 cards side-by-side) — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- Multiple view modes (grid, list, image-only) with persistent preference — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- Export results (copy names, download CSV) — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- Quick search chips with archetype-based suggestions — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- Cross-page header navigation with hash-based scrolling — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- Expanded deterministic translation with 30+ keyword patterns (ETB, LTB, myriad, blitz, connive, offspring, backup, goad) — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- Comprehensive security testing suite (300+ tests) covering injection, CORS, ReDoS, prototype pollution, timing attacks — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- Regression test suite with 70+ tests across caching, virtualization, and analytics — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- Virtualization for large result sets (50+ cards) — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- Session-level rate limiting and spam prevention — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- Query deduplication and duplicate parameter sanitization — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- Comprehensive Scryfall syntax validation — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- Reorganized codebase into domain folders (`core/`, `scryfall/`, `search/`, `security/`, `pwa/`) — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- Removed 16 unused UI components (~75KB bundle reduction) — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- Error monitoring placeholders (Sentry-ready) — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- Full i18n support: 11 languages (EN, ES, FR, DE, IT, PT, JA, KO, RU, ZHS, ZHT) covering UI and guide content — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- Documentation portal (`/docs`) with unified index, syntax cheat sheet (`/docs/syntax`), and guides hub — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- SEO domain standardization: canonical tags, hreflang for 11 locales, expanded sitemap covering all routes — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- **Deck Recommendations** (`/deck-recs`): AI-powered card suggestions via Moxfield import, with categorized results (High Synergy, Upgrades, Budget Picks) and Commander legality enforcement — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- **Combo Finder** (`/combos`): Discover card combos for any commander with prerequisites, steps, and pricing — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- **Archetypes** (`/archetypes`): Data-driven archetype browser across Commander, Pauper, Legacy & Premodern. Backed by `archetype_stats` materialized view for fast loading; `detect-archetypes` edge function tags community decks and `refresh_archetype_stats()` keeps the view fresh — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- **Features Showcase**: Landing page section highlighting all core tools with direct navigation — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- **Auth system**: User authentication with profiles, saved searches, avatar upload, and password reset — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- **Admin analytics dashboard**: Internal search analytics with top queries, low confidence breakdown, and trends — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- **PWA support**: Service worker registration with offline fallback and install banner — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- **Mana pip rendering**: Site-wide OracleText component renders {B}, {T}, etc. as Scryfall SVG icons in costs, rules text, combo steps, and deck recommendations — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- **Full i18n for Combo Finder, Deck Recommendations, Archetypes, Profile Settings, and Saved Searches**: All user-facing pages localized across 11 languages — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- **Deck Recommendations UX polish**: Loading skeletons, persistent error state, and OracleText mana rendering — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- **Sitemap expansion**: Added `/combos`, `/deck-recs`, `/archetypes` routes; domain set to `offmeta.app` — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- **CardModalCombos refactor**: useReducer pattern for complex combo state management — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- **EDHREC rank sorting**: Sort search results by EDHREC popularity rank (most/least popular) — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- **Accessibility improvements**: Skip-to-content links on all pages, focus trap on mobile menu, localized ARIA announcements and header nav labels across 11 languages — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- **Feedback auto-repair pipeline**: `process-feedback` processes each submission through Gemini 2.5 Flash Lite, generating a linked `translation_rules` row and transitioning the feedback row through `pending → processing → completed`. Fixed 401 rejection by adding `verify_jwt = false`. — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- **Nightly pattern promotion**: `generate-patterns-nightly` pg_cron job promotes high-frequency, high-confidence `translation_logs` queries into `translation_rules` each night at 03:00 UTC. Promotion criteria: ≥2 occurrences (lowered from 3), ≥0.8 confidence, ≥1 Scryfall result (guards against zero-result noise). Up to 50 new rules per run with deduplication against existing patterns. — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- **Admin feedback queue panel**: Upgraded feedback section in the admin analytics dashboard with full pipeline status badges, inline AI-generated rule display (pattern + Scryfall syntax + confidence), and one-click approve/reject actions that toggle `translation_rules.is_active`. — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- **Nightly log cleanup** (`cleanup-logs-nightly`): pg_cron job at 02:00 UTC deletes `translation_logs` and `analytics_events` older than 30 days, ensuring the pattern-promotion window is always clean when `generate-patterns` fires one hour later. — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]

- **Combo finder filtering/sorting**: Filter by color, price, and card count; sort by relevance and price — [Status: completed] [Priority: P1] [Discussion: Milestone `shipped`; owner `@core-team`]
- **Deck recommendation sideboard suggestions**: Sideboard category added to AI-powered recommendations — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]
- **Collection management**: Bulk import (text/CSV/Moxfield), value estimates via Scryfall prices, set tracking, CSV export with prices — [Status: completed] [Priority: P2] [Discussion: Milestone `shipped`; owner `@core-team`]

## Near term

- Wire card-meta-context edge function into card modal for "why this card matters" explanations — [Status: planned] [Priority: P1] [Discussion: Milestone `near-term`; owner `@core-team`]
- AI deck critique edge function with cut/addition suggestions — [Status: planned] [Priority: P1] [Discussion: Milestone `near-term`; owner `@core-team`]

## Mid term

- Card price tracking and alerts (daily snapshots, trend sparklines, price-drop notifications) — [Status: planned] [Priority: P2] [Discussion: Milestone `mid-term`; owner `@core-team`]
- Public user profiles with published decks and collection stats — [Status: planned] [Priority: P2] [Discussion: Milestone `mid-term`; owner `@core-team`]

## Long term

- Optimize translation accuracy with community-contributed patterns — [Status: planned] [Priority: P3] [Discussion: Milestone `long-term`; owner `@core-team`]
- Add card price tracking and alerts — [Status: planned] [Priority: P3] [Discussion: Milestone `long-term`; owner `@core-team`]
- Build social features (shared decklists, user profiles) — [Status: planned] [Priority: P3] [Discussion: Milestone `long-term`; owner `@core-team`]
