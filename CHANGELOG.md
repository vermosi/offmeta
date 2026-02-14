# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- 10 progressive search guides (`/guides`) from beginner to expert difficulty.
- Guides index page with visual cards, difficulty badges, and example queries.
- Individual guide pages with SEO metadata, JSON-LD structured data, and breadcrumbs.
- Card comparison view for side-by-side stat comparison (2–4 cards).
- Multiple view modes: grid, list, and image-only with persistent preference.
- Export results: copy card names or download CSV.
- Staples section on home page with archetype quick-search chips.
- Cross-page header navigation: hash links (Daily Pick, FAQ, How It Works) work from any page.
- 78 new tests: guides data integrity (22), GuidesIndex page (12), GuidePage (31), Header navigation (13).
- Guides documentation (`docs/guides.md`).
- OSS documentation, contribution, and governance guides.
- CI workflow and Dependabot configuration.
- Runtime environment validation and example configuration.
- Expanded tests and coverage thresholds.
- Trademark/branding guidelines for forks.

### Changed

- Header component now uses `useNavigate` and `useLocation` for cross-page hash scrolling.
- Guide pages use shared Header component instead of inline headers.
- Guides link in nav updated from single guide to `/guides` index.
- Standardized scripts, linting, and formatting tooling.
- Improved external fetch reliability with timeouts/retries.
- Switched the project license to AGPL-3.0.

### Fixed

- Hash navigation (Daily Pick, FAQ, How It Works) now works from non-home pages.
- Deterministic translation edge cases for mana production and color identity.
