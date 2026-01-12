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
- Expand automated tests around Edge Function behavior and translation fallback paths.
- Add contract tests for Supabase Edge Functions when running locally.
- Document deployment steps for Supabase + hosting provider once finalized.

## What I changed in this hardening pass
- Added runtime environment validation, examples, and documentation.
- Standardized scripts, linting, formatting, and Node version hygiene.
- Expanded unit tests, added coverage thresholds, and mocked API tests.
- Hardened external fetches with timeouts/retries and improved logging.
- Added OSS docs, templates, CI, and contributor workflows.
- Clarified AGPL licensing and trademark/branding guardrails.
