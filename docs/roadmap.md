# Roadmap

Tracking format: `[Status: <planned|in progress|blocked|completed>] [Priority: <P0-P3>] [Discussion: <issue|milestone|owner>]`

## Now

| Item | Status | Priority | Discussion |
| --- | --- | --- | --- |
| Finish the search/results UX pass: tighten filter spacing, card density, and empty-state recovery on mobile and desktop. | planned | P1 | Milestone `near-term`; owner `@core-team` |
| Strengthen the trust story in search: make query disclosure, provenance, and confidence easier to scan around results. | planned | P1 | Milestone `near-term`; owner `@core-team` |
| Polish the mobile shell: header/menu, results toolbar, and card-detail spacing edge cases before adding new surface area. | planned | P2 | Milestone `near-term`; owner `@core-team` |
| Wire `card-meta-context` into the card modal for "why this card matters" explanations. | planned | P2 | Milestone `near-term`; owner `@core-team` |

## Next

| Item | Status | Priority | Discussion |
| --- | --- | --- | --- |
| Ship the AI deck critique flow with cut/addition suggestions and clear recommendation reasons. | planned | P2 | Milestone `mid-term`; owner `@core-team` |
| Add card price tracking and alerts with daily snapshots, trend sparklines, and price-drop notifications. | planned | P2 | Milestone `mid-term`; owner `@core-team` |
| Launch public user profiles with published decks and collection stats. | planned | P2 | Milestone `mid-term`; owner `@core-team` |

## Later

| Item | Status | Priority | Discussion |
| --- | --- | --- | --- |
| Optimize translation accuracy with community-contributed patterns. | planned | P3 | Milestone `long-term`; owner `@core-team` |
| Expand social features beyond public profiles, including sharing and collaboration flows. | planned | P3 | Milestone `long-term`; owner `@core-team` |

## Completed

| Item | Status | Priority | Discussion |
| --- | --- | --- | --- |
| Mobile-first responsive design with standardized spacing system (progressive padding and margins across breakpoints). | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Home discovery section cleanup, removing low-engagement sections and keeping Recent Searches, Curated Searches, and FAQ. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| 10 progressive search guides from beginner to expert with SEO optimization and JSON-LD. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Card comparison view for comparing 2-4 cards side by side. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Multiple view modes, including grid, list, and image-only, with persistent preference. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Export results with copy names and CSV download. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Quick search chips with archetype-based suggestions. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Cross-page header navigation with hash-based scrolling. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Expanded deterministic translation with 30+ keyword patterns, including ETB, LTB, myriad, blitz, connive, offspring, backup, and goad. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Comprehensive security testing suite covering injection, CORS, ReDoS, prototype pollution, and timing attacks. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Regression test suite across caching, virtualization, and analytics. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Virtualization for large result sets. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Session-level rate limiting and spam prevention. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Query deduplication and duplicate parameter sanitization. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Comprehensive Scryfall syntax validation. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Reorganized the codebase into domain folders: `core/`, `scryfall/`, `search/`, `security/`, and `pwa/`. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Removed 16 unused UI components for a smaller bundle. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Error monitoring placeholders with Sentry-ready hooks. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Full i18n support across 11 languages for UI and guide content. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Documentation portal with unified index, syntax cheat sheet, and guides hub. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| SEO domain standardization with canonical tags, hreflang, and expanded sitemap coverage. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Deck Recommendations for AI-powered suggestions via Moxfield import, with categorized results and Commander legality enforcement. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Combo Finder for discovering card combos with prerequisites, steps, and pricing. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Archetypes browser across Commander, Pauper, Legacy, and Premodern. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Features Showcase landing section with direct navigation to core tools. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Auth system with profiles, saved searches, avatar upload, and password reset. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Admin analytics dashboard with top queries, low-confidence breakdown, and trends. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| PWA support with service worker registration and install banner. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Mana pip rendering across costs, rules text, combo steps, and deck recommendations. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Full i18n for Combo Finder, Deck Recommendations, Archetypes, Profile Settings, and Saved Searches. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Deck Recommendations UX polish with loading skeletons, persistent error state, and OracleText mana rendering. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Sitemap expansion for `/combos`, `/deck-recs`, and `/archetypes`, with domain set to `offmeta.app`. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| `CardModalCombos` refactor using `useReducer` for complex combo state management. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| EDHREC rank sorting for search results. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Accessibility improvements including skip links, mobile menu focus trap, and localized ARIA announcements. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Feedback auto-repair pipeline that generates linked translation rules from feedback submissions. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Nightly pattern promotion from translation logs into translation rules. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Admin feedback queue panel with pipeline status badges, inline rule display, and approve/reject actions. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Nightly log cleanup for translation logs and analytics events. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Combo finder filtering and sorting by color, price, card count, relevance, and price. | completed | P1 | Milestone `shipped`; owner `@core-team` |
| Deck recommendation sideboard suggestions. | completed | P2 | Milestone `shipped`; owner `@core-team` |
| Collection management with bulk import, value estimates, set tracking, and CSV export. | completed | P2 | Milestone `shipped`; owner `@core-team` |
