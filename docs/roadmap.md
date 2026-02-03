# Roadmap

## Completed

- Expanded deterministic translation with 30+ keyword patterns (ETB, LTB, myriad, blitz, connive, offspring, backup, goad)
- Added regression test suite with 68+ tests across 6 categories
- Implemented virtualization for large result sets (50+ cards)
- Added session-level rate limiting and spam prevention
- Built query deduplication and duplicate parameter sanitization
- Created comprehensive Scryfall syntax validation
- Reorganized codebase into domain folders (`core/`, `scryfall/`, `search/`, `pwa/`)
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
