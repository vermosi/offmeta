# Roadmap

## Completed

- Mobile-first responsive design with standardized spacing system (progressive padding/margins across breakpoints)
- Home discovery section (Recent Searches, Daily Pick, Features Showcase, Staples, How It Works, FAQ)
- 10 progressive search guides (beginner → expert) with SEO optimization and JSON-LD
- Card comparison view (compare 2–4 cards side-by-side)
- Multiple view modes (grid, list, image-only) with persistent preference
- Export results (copy names, download CSV)
- Staples section with archetype-based quick searches
- Cross-page header navigation with hash-based scrolling
- Expanded deterministic translation with 30+ keyword patterns (ETB, LTB, myriad, blitz, connive, offspring, backup, goad)
- Comprehensive security testing suite (300+ tests) covering injection, CORS, ReDoS, prototype pollution, timing attacks
- Regression test suite with 70+ tests across caching, virtualization, and analytics
- Virtualization for large result sets (50+ cards)
- Session-level rate limiting and spam prevention
- Query deduplication and duplicate parameter sanitization
- Comprehensive Scryfall syntax validation
- Reorganized codebase into domain folders (`core/`, `scryfall/`, `search/`, `security/`, `pwa/`)
- Removed 16 unused UI components (~75KB bundle reduction)
- Error monitoring placeholders (Sentry-ready)
- Full i18n support: 11 languages (EN, ES, FR, DE, IT, PT, JA, KO, RU, ZHS, ZHT) covering UI and guide content
- Documentation portal (`/docs`) with unified index, syntax cheat sheet (`/docs/syntax`), and guides hub
- SEO domain standardization: canonical tags, hreflang for 11 locales, expanded sitemap covering all routes
- **Deck Recommendations** (`/deck-recs`): AI-powered card suggestions via Moxfield import or text paste, with categorized results (High Synergy, Upgrades, Budget Picks) and Commander legality enforcement
- **Combo Finder** (`/combos`): Discover card combos for any commander with prerequisites, steps, and pricing
- **Commander Archetypes** (`/archetypes`): Browse popular archetypes with curated card lists and quick-search
- **Features Showcase**: Landing page section highlighting all core tools with direct navigation
- **Auth system**: User authentication with profiles, saved searches, avatar upload, and password reset
- **Admin analytics dashboard**: Internal search analytics with top queries, low confidence breakdown, and trends
- **PWA support**: Service worker registration with offline fallback and install banner
- **Mana pip rendering**: Site-wide OracleText component renders {B}, {T}, etc. as Scryfall SVG icons in costs, rules text, combo steps, and deck recommendations
- **Full i18n for Combo Finder, Deck Recommendations, Archetypes, Profile Settings, and Saved Searches**: All user-facing pages localized across 11 languages
- **Deck Recommendations UX polish**: Loading skeletons, persistent error state, and OracleText mana rendering
- **Sitemap expansion**: Added `/combos`, `/deck-recs`, `/archetypes` routes; domain set to `offmeta.app`
- **CardModalCombos refactor**: useReducer pattern for complex combo state management
- **EDHREC rank sorting**: Sort search results by EDHREC popularity rank (most/least popular)
- **Accessibility improvements**: Skip-to-content links on all pages, focus trap on mobile menu, localized ARIA announcements and header nav labels across 11 languages
- **Feedback auto-repair pipeline**: `process-feedback` processes each submission through Gemini 2.5 Flash Lite, generating a linked `translation_rules` row and transitioning the feedback row through `pending → processing → completed`. Fixed 401 rejection by adding `verify_jwt = false`.
- **Nightly pattern promotion**: `generate-patterns-nightly` pg_cron job promotes high-frequency, high-confidence `translation_logs` queries into `translation_rules` each night at 03:00 UTC. Promotion criteria: ≥2 occurrences (lowered from 3), ≥0.8 confidence, ≥1 Scryfall result (guards against zero-result noise). Up to 50 new rules per run with deduplication against existing patterns.
- **Admin feedback queue panel**: Upgraded feedback section in the admin analytics dashboard with full pipeline status badges, inline AI-generated rule display (pattern + Scryfall syntax + confidence), and one-click approve/reject actions that toggle `translation_rules.is_active`.
- **Nightly log cleanup** (`cleanup-logs-nightly`): pg_cron job at 02:00 UTC deletes `translation_logs` and `analytics_events` older than 30 days, ensuring the pattern-promotion window is always clean when `generate-patterns` fires one hour later.

## Near term

- Expand combo finder with filtering and sorting options

## Mid term

- Enhance deck recommendations with sideboard suggestions
- Add collection management and tracking

## Long term

- Optimize translation accuracy with community-contributed patterns
- Add card price tracking and alerts
- Build social features (shared decklists, user profiles)
