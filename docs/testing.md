# Testing

OffMeta uses [Vitest](https://vitest.dev/) as the primary testing framework, with Playwright for E2E and accessibility coverage.

## Tooling convention

- **Canonical runner:** `npm` (matches CI and required status checks).
- **Optional equivalent:** `bun` for local runs if preferred.

Canonical commands:

```bash
npm run test
npm run test:watch
npm run test -- --coverage
```

Optional Bun equivalents:

```bash
bun run test
bun run test:watch
bun run test -- --coverage
```

## Quick start

```bash
npm run test
npm run test:watch
npm run test -- --coverage
```

## Test categories

### Golden translation tests

Located in `src/lib/translation-golden.test.ts` and related files. These verify natural language → Scryfall syntax translation accuracy.

```bash
npm run test -- translation-golden
```

### Property-based tests (fast-check)

Located in `src/lib/query-translator.property.test.ts`. These verify core invariants across arbitrary inputs.

```bash
npm run test -- query-translator.property
```

### Security tests

Located in `src/lib/security/`. Comprehensive security coverage including:

| Category            | File                          | Description                             |
| ------------------- | ----------------------------- | --------------------------------------- |
| Input Sanitization  | `input-sanitization.test.ts`  | SQL/XSS/command injection prevention    |
| Injection Attacks   | `injection.test.ts`           | NoSQL and header injection              |
| Rate Limiting       | `rate-limiting.test.ts`       | Request throttling and abuse prevention |
| Authentication      | `authentication.test.ts`      | Auth bypass and token validation        |
| CORS Protection     | `cors-bypass.test.ts`         | Origin allowlist and security headers   |
| Prototype Pollution | `prototype-pollution.test.ts` | `__proto__` and constructor attacks     |
| ReDoS Prevention    | `redos.test.ts`               | Regex denial-of-service mitigation      |
| Timing Attacks      | `timing-attacks.test.ts`      | Constant-time comparison validation     |
| Error Leakage       | `error-leakage.test.ts`       | Path/stack/credential sanitization      |
| Config Sync         | `config-sync.test.ts`         | Security constant synchronization       |

Run security tests only:

```bash
npm run test -- src/lib/security
```

### HTTP edge-function security tests

Located in `src/tests/api/edge-function.test.ts`. These are gated behind an env var.

```bash
RUN_API_TESTS=1 npm run test -- src/tests/api/
```

### Edge function tests

Located in `supabase/functions/semantic-search/`. Tests for the backend translation pipeline.

```bash
npm run test -- supabase/functions
```

### Component tests

Behavioral unit tests for UI components in `src/components/*/__tests__/`.

```bash
npm run test -- src/components
```

### Page tests

Tests for page-level components in `src/pages/__tests__/`.

```bash
npm run test -- src/pages
```

### Decklist parser tests

Unit tests for `src/lib/__tests__/decklist-parser.test.ts`.

```bash
npm run test -- src/lib/__tests__/decklist-parser
```

### Guides data tests

Structural and content quality tests for `src/data/__tests__/guides.test.ts`.

```bash
npm run test -- src/data/__tests__/guides
```

### Regression tests

Located in `src/lib/regression/`. Integration tests for caching, virtualization, and analytics.

```bash
npm run test -- src/lib/regression
```

### E2E tests (Playwright)

Located in `src/tests/e2e/search.spec.ts`.

```bash
npx playwright install --with-deps chromium
npx playwright test
```

### Accessibility tests (Playwright + axe-core)

Located in `src/tests/e2e/accessibility.spec.ts`.

```bash
npx playwright test --grep @a11y
```

### Live Scryfall validation (opt-in)

Two suites validate queries and tags against the live Scryfall API:

- `src/lib/scryfall-syntax-validation.test.ts`
- `src/lib/scryfall-otag-validation.test.ts`

These are skipped by default to keep CI deterministic. Enable with:

```bash
RUN_SCRYFALL_LIVE_TESTS=1 npm run test -- src/lib/scryfall-syntax-validation.test.ts src/lib/scryfall-otag-validation.test.ts
```

A dedicated CI job runs these weekly.

## Coverage

Coverage thresholds are enforced in `vite.config.ts`. Generate coverage locally with:

```bash
npm run test -- --coverage
```

## CI integration

All tests run automatically on pull requests via GitHub Actions (`.github/workflows/ci.yml`). Pull requests always run lightweight `e2e-smoke` and `a11y-smoke` jobs (critical navigation/search/dialog + one axe suite), while full `e2e` and `a11y` coverage remains on push/nightly/manual runs and can be opted into on PRs with `ci:e2e` / `ci:a11y` labels.

For branch protection, require: `lint`, `typecheck`, `test`, `build`, `bundle-size`, `e2e-smoke`, and `a11y-smoke`.
