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

Use `npm` as the canonical task runner because CI and required checks run npm scripts. Bun is supported as an optional local equivalent for common test commands; see [`docs/testing.md`](./testing.md) for the canonical test command set.

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
