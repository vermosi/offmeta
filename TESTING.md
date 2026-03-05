# Testing

OffMeta uses [Vitest](https://vitest.dev/) for unit/integration tests and [Playwright](https://playwright.dev/) for E2E and accessibility tests, with **1,560+ tests** across multiple categories.

## Tooling convention

- **Canonical runner:** `npm` (matches CI workflows and required checks).
- **Optional equivalent:** `bun` for local execution.

Canonical commands:

```bash
npm run test          # Run all unit/integration tests
npm run test:watch    # Watch mode
npm run test -- --coverage  # With coverage report
```

Optional Bun equivalents:

```bash
bun run test
bun run test:watch
bun run test -- --coverage
```

---

## Quick Start

```bash
npm run test          # Run all unit/integration tests
npm run test:watch    # Watch mode
npm run test -- --coverage  # With coverage report
```

---

## CI Pipeline Structure

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs parallel jobs for fast feedback:

```
┌──────────┐
│  install  │  checkout + npm ci + cache node_modules
└─────┬─────┘
      │
      ├──► lint          (eslint, every push/PR)
      ├──► typecheck     (tsc --noEmit, every push/PR)
      ├──► test          (vitest + coverage thresholds, every push/PR)
      ├──► build         (vite build, every push/PR)
       └──► bundle-size   (gzip check ≤500KB JS, every push/PR)
       ├──► e2e-smoke      (PR-required smoke suite: navigation + search + dialog)
       ├──► a11y-smoke     (PR-required axe smoke suite)
       ├──► e2e            (full Playwright matrix on push/nightly/manual + PR opt-in label)
       ├──► a11y           (full axe matrix on push/nightly/manual + PR opt-in label)

On-demand jobs:
   ├──► api-security     (edge function HTTP tests, workflow_dispatch only)
   └──► live-scryfall    (syntax + otag validation, weekly Monday 06:00 UTC)
```

### Triggers

| Trigger               | Jobs                                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `push` to `main`      | lint, typecheck, test, build, bundle-size, e2e, a11y                                                             |
| Pull request          | lint, typecheck, test, build, bundle-size, e2e-smoke, a11y-smoke (full e2e/a11y via `ci:e2e` / `ci:a11y` labels) |
| Nightly (`0 3 * * *`) | e2e, a11y                                                                                                        |
| Weekly (`0 6 * * 1`)  | live-scryfall-validation                                                                                         |
| `workflow_dispatch`   | All jobs available on-demand                                                                                     |

### Required status checks for branch protection

Configure branch protection for `main` to require these checks on pull requests:

- `lint`
- `typecheck`
- `test`
- `build`
- `bundle-size`
- `e2e-smoke`
- `a11y-smoke`

This keeps a lightweight always-on gate (critical navigation/search/dialog plus one axe suite) while preserving broader full-suite coverage in push/nightly/manual runs.

---

## Test Categories

### Unit & Integration Tests

The default `npm run test` command runs all Vitest tests in `src/`.

```bash
npm run test
```

### Property-Based Tests (fast-check)

Located in `src/lib/query-translator.property.test.ts`. Uses [fast-check](https://github.com/dubzzz/fast-check) to verify invariants across arbitrary inputs:

- `validateScryfallQuery()` never throws on any string
- `sanitizeErrorForClient()` never leaks file paths or tokens
- Cache set/get roundtrip always returns original value
- `containsPrototypePollution()` detects `__proto__` in any context

```bash
npm run test -- query-translator.property
```

### Golden Translation Tests (~200 tests)

Located in `src/lib/translation-golden.test.ts`. Verify natural language → Scryfall syntax accuracy.

```bash
npm run test -- translation-golden
```

### Security Tests (300+ tests)

Located in `src/lib/security/`. Comprehensive coverage:

| Category            | File                          |
| ------------------- | ----------------------------- |
| Input Sanitization  | `input-sanitization.test.ts`  |
| Injection Attacks   | `injection.test.ts`           |
| Rate Limiting       | `rate-limiting.test.ts`       |
| Authentication      | `authentication.test.ts`      |
| CORS Protection     | `cors-bypass.test.ts`         |
| Prototype Pollution | `prototype-pollution.test.ts` |
| ReDoS Prevention    | `redos.test.ts`               |
| Timing Attacks      | `timing-attacks.test.ts`      |
| Error Leakage       | `error-leakage.test.ts`       |
| Config Sync         | `config-sync.test.ts`         |

```bash
npm run test -- src/lib/security
```

### HTTP Edge Function Security Tests

Located in `src/tests/api/edge-function.test.ts`. Tests live edge function responses for auth (401), CORS, and error sanitization. **Gated behind an env var:**

```bash
RUN_API_TESTS=1 npm run test -- src/tests/api/
```

### E2E Tests (Playwright)

Located in `src/tests/e2e/search.spec.ts`. Requires Playwright browsers installed locally:

```bash
npx playwright install --with-deps chromium
npx playwright test
```

**Tests:**

1. Page loads and search input is visible
2. Typing a query and pressing Enter shows card results
3. Submitting empty query shows inline error without network call
4. Clicking first card opens a modal
5. Pressing Escape closes the modal

### Accessibility Tests (Playwright + axe-core)

Located in `src/tests/e2e/accessibility.spec.ts`. Runs [axe](https://github.com/dequelabs/axe-core) audits:

```bash
npx playwright test --grep @a11y
```

Asserts zero critical or serious WCAG 2.1 AA violations on the homepage and card modal.

### Live Scryfall Validation (opt-in)

Two suites validate queries and tags against the live Scryfall API:

- `src/lib/scryfall-syntax-validation.test.ts` — 100+ syntax queries
- `src/lib/scryfall-otag-validation.test.ts` — 170+ oracle/art tags

```bash
RUN_SCRYFALL_LIVE_TESTS=1 npm run test -- src/lib/scryfall-syntax-validation.test.ts src/lib/scryfall-otag-validation.test.ts
```

### Component & Page Tests

```bash
npm run test -- src/components    # UI component tests
npm run test -- src/pages         # Page-level tests
```

### Regression Tests

Located in `src/lib/regression/`. Integration tests for caching, virtualization, and analytics.

```bash
npm run test -- src/lib/regression
```

---

## Coverage Thresholds

Coverage is enforced by Vitest on every test run. The build **fails** if thresholds are not met.

| Metric     | Threshold |
| ---------- | --------- |
| Lines      | 85%       |
| Functions  | 85%       |
| Branches   | 80%       |
| Statements | 85%       |

**Scope:** `src/lib/**` (excluding `src/lib/logger.ts`)

Generate a local coverage report:

```bash
npm run test -- --coverage
# Reports: text (terminal), json-summary, lcov
# Output directory: coverage/
```

---

## Bundle Size Limits

CI fails if total gzipped JS assets in `dist/assets/` exceed **500KB**. The bundle-size job produces a markdown summary table in the GitHub Actions step summary.

---

## Configuration Files

| File                       | Purpose                                           |
| -------------------------- | ------------------------------------------------- |
| `vite.config.ts`           | Vitest config (test section), coverage thresholds |
| `playwright.config.ts`     | Playwright config, targets `localhost:8080`       |
| `.github/workflows/ci.yml` | Full CI pipeline definition                       |
| `src/test/setup.ts`        | Vitest setup (jest-dom, matchMedia polyfill)      |

---

## Writing New Tests

- Place unit tests alongside source: `MyComponent.test.tsx` or in `__tests__/`
- Place E2E tests in `src/tests/e2e/`
- Place API tests in `src/tests/api/`
- Use `describe.skip` or env var gates for tests requiring external services
- Property-based tests go in `src/lib/` with `.property.test.ts` suffix
