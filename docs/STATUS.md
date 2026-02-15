# Project Status

## What this is

OffMeta is a natural-language search frontend for Magic: The Gathering cards. It translates plain-English queries into Scryfall search syntax using backend edge functions and returns card results in a React 19 + Vite UI.

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

- Add contract tests for Edge Functions when running locally.
- Document deployment steps once finalized.
- Expand accessibility audits and keyboard navigation.
- Add localization support for UI and queries.

## Recent additions

- **Mobile-First Responsive Design**: Standardized spacing system with progressive scaling across mobile (390px), tablet (768px), and desktop (1280px+). Overflow protection on all pages.
- **Home Discovery Section**: Dedicated section with Recent Searches, Daily Pick, Staples, How It Works, and FAQ.
- **Search Guides**: 10 progressive guides (`/guides`) teaching natural language search from basic to expert.
- **Card Comparison**: Side-by-side comparison of 2–4 cards.
- **View Modes**: Grid, list, and image-only views with persistent preference.
- **Export Results**: Copy card names or download CSV.
- **Staples Section**: Archetype quick-search chips on home page.
- **Cross-page Navigation**: Hash links work from any page (navigate home + scroll).
- **Security Suite**: 300+ security tests covering injection, CORS, ReDoS, prototype pollution, and timing attacks.
- **Regression Suite**: 70+ regression tests across caching, virtualization, and analytics.
