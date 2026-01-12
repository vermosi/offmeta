# Contributing

Thanks for helping improve OffMeta!

## Prerequisites
- Node.js (see `.nvmrc`)
- npm
- Supabase project credentials (for Edge Function changes)

## Local setup
```bash
npm install
cp .env.example .env
npm run dev
```

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

## Style rules
- Use Prettier formatting (`npm run format`).
- Avoid `any` unless necessary.
- Keep query translation changes covered by tests.

## Adding tests
- Add unit tests in `src/**/*.test.ts`.
- Extend the deterministic golden tests in `src/lib/search/deterministic.test.ts` when changing translation logic.

## License and DCO
By contributing, you agree that your contributions are licensed under the AGPL-3.0.

Optionally, you can add a DCO sign-off to your commits:
```bash
git commit -s -m "feat: describe change"
```

## Commit convention
Conventional Commits are recommended (e.g., `feat: add deterministic rule for equip costs`).
