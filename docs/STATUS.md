# Project Status

## What this is

OffMeta is a natural-language search frontend for Magic: The Gathering cards. It translates plain-English queries into Scryfall search syntax using Supabase Edge Functions and returns card results in a React + Vite UI.

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

- Add contract tests for Supabase Edge Functions when running locally.
- Document deployment steps for Supabase + hosting provider once finalized.
- Expand accessibility audits and keyboard navigation.
- Fix mobile hamburger menu overlay opacity (nav items overlap content).

## Recent additions

- **Search Guides**: 10 progressive guides (`/guides`) teaching natural language search from basic to expert.
- **Card Comparison**: Side-by-side comparison of 2–4 cards.
- **View Modes**: Grid, list, and image-only views with persistent preference.
- **Export Results**: Copy card names or download CSV.
- **Staples Section**: Archetype quick-search chips on home page.
- **Cross-page Navigation**: Hash links work from any page (navigate home + scroll).

## What I changed in this hardening pass

- Added runtime environment validation, examples, and documentation.
- Standardized scripts, linting, formatting, and Node version hygiene.
- Expanded unit tests, added coverage thresholds, and mocked API tests.
- Hardened external fetches with timeouts/retries and improved logging.
- Added OSS docs, templates, CI, and contributor workflows.
- Clarified AGPL licensing and trademark/branding guardrails.
- Added comprehensive security testing suite (300+ tests) covering injection, CORS, ReDoS, prototype pollution, and timing attacks.
- Added 78 new tests for guides system (data integrity, page rendering, navigation, SEO).
