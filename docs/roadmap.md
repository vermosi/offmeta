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

## Near term

- Improve accessibility audits and keyboard navigation
- Add Edge Function contract tests

## Mid term

- Add search analytics dashboards for maintainers
- Implement user accounts for saved searches

## Long term

- Optimize translation accuracy with community-contributed patterns
- Add card price tracking and alerts
- Build collection management features
