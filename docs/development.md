# Development

This page is the practical guide for working on OffMeta locally. It covers setup, the canonical commands, and the conventions that keep the repo predictable across contributors.

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

The app uses npm as the only package manager. Keep `package-lock.json` as the single lockfile source of truth.

## Canonical Commands

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:watch`
- `npm run check`

Use these commands before opening a PR or when you need to verify a change without relying on the UI alone.

## Local Workflow

1. Pull the latest branch state.
2. Install or refresh dependencies.
3. Start the dev server.
4. Make your code change.
5. Run the relevant tests first, then the full suite if the change is broad.
6. Review the diff for accidental formatting or stale references.

That sequence is intentionally boring. It keeps the repo stable and makes it easier to tell a real regression from a setup issue.

## Conventions

- Use `npm` only.
- Keep `package-lock.json` as the single lockfile.
- Do not commit Bun lockfiles.
- Prefer small, focused changes that are easy to review.
- Keep TypeScript strictness intact and avoid introducing `any` unless there is no reasonable alternative.

## Environment Variables

The repo distinguishes between frontend runtime values and server-side values:

- Frontend canonical values: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- Edge-function canonical values: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`

Some test and local-tooling helpers can fall back to the frontend names for convenience, but that fallback is a compatibility path rather than the production contract.

## Edge Functions

Edge functions live in `supabase/functions/`. Use the Supabase CLI when you need to run or inspect them locally.

The usual pattern is:

- keep browser code on the client
- keep privileged and secret-bearing work in edge functions
- share validation and contract helpers where tests need them

## Helpful References

- [README.md](../README.md) - overall project overview
- [Architecture](./architecture.md) - system boundaries and data flow
- [Testing](./testing.md) - canonical test surface and CI notes
- `src/integrations/supabase/client.ts` - frontend Supabase client
- `supabase/config.toml` - Supabase configuration
