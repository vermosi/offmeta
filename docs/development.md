# Development

This page is the short index for local setup and workflow.

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

## Canonical commands

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:watch`
- `npm run check`

## Conventions

- Use `npm` only
- Keep `package-lock.json` as the single lockfile
- Do not commit Bun lockfiles

## Edge functions

Edge functions live in `supabase/functions/`. Use the Supabase CLI when you need to run them locally.

For more detail, see [README.md](../README.md) and [docs/testing.md](./testing.md).
