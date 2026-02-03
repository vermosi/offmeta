# Contributing

Thanks for helping improve OffMeta!

## Prerequisites

- Node.js (see `.nvmrc` for the supported version)
- npm (bundled with Node.js)
- Supabase project credentials (for Edge Function changes)

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Project scripts

| Script               | Description                  |
| -------------------- | ---------------------------- |
| `npm run dev`        | Start the Vite dev server    |
| `npm run build`      | Production build             |
| `npm run start`      | Preview the production build |
| `npm run lint`       | Run ESLint                   |
| `npm run format`     | Run Prettier                 |
| `npm run typecheck`  | TypeScript type check        |
| `npm run test`       | Vitest run                   |
| `npm run test:watch` | Vitest watch mode            |
| `npm run check`      | Lint + typecheck + test      |

## Supabase Edge Functions

Edge functions live in `supabase/functions`. Use the Supabase CLI to serve them locally when needed.

## Branching & PRs

1. Create a branch from `main` (e.g., `feature/your-change`).
2. Keep changes focused and small.
3. Open a PR with a clear description and screenshots when UI changes are made.

## Running checks

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Pre-commit hooks

This repo uses Husky + lint-staged. After `npm install`, hooks will run automatically on commit.

## Code style

- Prefer small, focused components.
- Keep hooks in `src/hooks` and pure utilities in `src/lib`.
- Use named exports for shared utilities.
- Avoid `any` unless absolutely necessary.
- Prettier is the source of truth — run `npm run format` before opening a PR.

## Testing guidelines

- Add unit tests in `src/**/*.test.ts`.
- Favor table-driven tests for query translation.
- Add regression tests for any bug fix.
- Extend the golden tests in `src/lib/translation-golden.test.ts` when changing translation logic.
- Security-related changes should include tests in `src/lib/security/`.

## Commit convention

Conventional Commits are recommended:

```bash
feat: add deterministic rule for equip costs
fix: handle edge case in color parsing
docs: update API reference
```

## License and DCO

By contributing, you agree that your contributions are licensed under the AGPL-3.0.

Optionally, you can add a DCO sign-off to your commits:

```bash
git commit -s -m "feat: describe change"
```
