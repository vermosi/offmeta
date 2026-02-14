# Roadmap

## Completed

- 10 progressive search guides (beginner → expert) with SEO optimization and JSON-LD
- Card comparison view (compare 2–4 cards side-by-side)
- Multiple view modes (grid, list, image-only) with persistent preference
- Export results (copy names, download CSV)
- Staples section with archetype-based quick searches
- Cross-page header navigation with hash-based scrolling
- Expanded deterministic translation with 30+ keyword patterns (ETB, LTB, myriad, blitz, connive, offspring, backup, goad)
- Added comprehensive security testing suite (300+ tests) covering injection, CORS, ReDoS, prototype pollution, timing attacks
- Added regression test suite with 70+ tests across caching, virtualization, and analytics
- Implemented virtualization for large result sets (50+ cards)
- Added session-level rate limiting and spam prevention
- Built query deduplication and duplicate parameter sanitization
- Created comprehensive Scryfall syntax validation
- Reorganized codebase into domain folders (`core/`, `scryfall/`, `search/`, `security/`, `pwa/`)
- Removed 16 unused UI components (~75KB bundle reduction)
- Added error monitoring placeholders (Sentry-ready)

## Near term

- Improve accessibility audits and keyboard navigation
- Add localization support for UI and queries
- Deploy docs site with usage guides and prompt examples
- Add Edge Function contract tests

## Mid term

- Add search analytics dashboards for maintainers
- Implement user accounts for saved searches
- Add deck builder integration

## Long term

- Optimize translation accuracy with community-contributed patterns
- Add card price tracking and alerts
- Build collection management features
