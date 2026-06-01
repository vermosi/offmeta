# Development

## Prerequisites

- Node.js (see `.nvmrc` for the supported version)
- npm (bundled with Node.js)

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Tooling convention

Use `npm` as the only supported package manager and task runner. CI and required checks install dependencies with `npm ci`, and `package-lock.json` is the sole dependency lockfile source. Do not commit Bun lockfiles (`bun.lock` or `bun.lockb`); if dependency metadata changes, update `package-lock.json` with npm. See [`docs/testing.md`](./testing.md) for the canonical test command set.

## Project scripts

- `npm run dev`: Start the Vite dev server
- `npm run build`: Production build
- `npm run start`: Preview the production build
- `npm run lint`: Run ESLint
- `npm run format`: Run Prettier
- `npm run typecheck`: TypeScript type check
- `npm run test`: Vitest run
- `npm run test:watch`: Vitest watch mode
- `npm run check`: Lint + typecheck + test

## Supabase Edge Functions

Edge functions live in `supabase/functions`. Use the Supabase CLI to serve them locally when needed.
