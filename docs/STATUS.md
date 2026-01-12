# Project Status

## What this is
OffMeta is a natural-language search interface for Magic: The Gathering cards. It translates plain-English queries into Scryfall syntax and then renders results from the Scryfall API, with optional AI-assisted translation in Supabase Edge Functions.

## How to run

```bash
npm install
npm run dev
```

For production builds:

```bash
npm run build
npm run start
```

## Known gaps / TODO
- Expand deterministic translation coverage for edge cases and additional MTG formats.
- Add integration tests for Supabase Edge Functions (requires local Supabase emulator).
- Add visual regression checks for critical UI components.

## Repo scan summary
- **Package manager**: npm (package-lock.json), Bun lock present for tooling.
- **Framework/runtime**: Vite + React (frontend), Deno (Supabase Edge Functions).
- **Deployment assumptions**: Supabase Edge Functions + Scryfall API; Vite build served via static hosting or Vite preview.
- **Primary entry points**: `src/main.tsx` (frontend), `supabase/functions/semantic-search/index.ts` (Edge Function).
- **Environment variables**: See `.env.example` and `docs/configuration.md`.
- **API endpoints**: Supabase Edge Functions under `supabase/functions/*` (semantic-search, process-feedback, generate-patterns, warmup-cache, cleanup-logs).
- **Build/dev scripts**: `npm run dev`, `npm run build`, `npm run start`.
- **Tests**: `npm run test` (Vitest unit tests).
- **Lint/format**: `npm run lint`, `npm run format`.

## What I changed in this hardening pass
- Added OSS-facing docs (governance, support, contribution, architecture, configuration, roadmap, FAQ, style guide).
- Standardized Node version requirements and added runtime env validation.
- Implemented CI with lint, typecheck, tests, build, and coverage artifacts.
- Added linting/formatting tooling plus pre-commit hooks.
- Expanded deterministic search tests and added env validation tests.
- Added request correlation IDs to Edge Function responses for observability.
