# Contributing to OffMeta

Thanks for your interest in contributing!

## Prerequisites
- Node.js 20.11+ (see `.nvmrc`)
- npm 9+ recommended

## Local setup
```bash
npm install
cp .env.example .env
npm run dev
```

## Branching & PR process
1. Fork the repo and create a feature branch.
2. Keep changes focused and include tests where applicable.
3. Open a PR against `main` with a clear summary and test results.

## Running checks locally
```bash
npm run lint
npm run typecheck
npm run test
```

Pre-commit hooks run `lint-staged` automatically if Husky is installed (`npm install` will set it up).

## Style rules
- Follow the formatting rules enforced by Prettier.
- Keep imports ordered per ESLint rules.
- Avoid `any` unless absolutely necessary and documented.

## Adding tests
- Add unit tests in `src/**/*.test.ts`.
- For translation rules, add table-driven tests in `src/lib/search/deterministic.test.ts`.

## Commit message convention
Conventional Commits are recommended:
- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `chore:` tooling/maintenance
