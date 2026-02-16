# Testing

OffMeta uses [Vitest](https://vitest.dev/) as the primary testing framework with 1,450+ tests across multiple categories.

## Run tests

```bash
npm run test
```

## Watch mode

```bash
npm run test:watch
```

## Coverage

Coverage thresholds are enforced in `vite.config.ts`. Generate coverage locally with:

```bash
npm run test -- --coverage
```

## Test Categories

### Golden Translation Tests (~200 tests)

Located in `src/lib/translation-golden.test.ts` and related files. These verify natural language → Scryfall syntax translation accuracy.

```bash
npm run test -- translation-golden
```

### Security Tests (300+ tests)

Located in `src/lib/security/`. Comprehensive security coverage including:

| Category | File | Description |
|----------|------|-------------|
| Input Sanitization | `input-sanitization.test.ts` | SQL/XSS/command injection prevention |
| Injection Attacks | `injection.test.ts` | NoSQL and header injection |
| Rate Limiting | `rate-limiting.test.ts` | Request throttling and abuse prevention |
| Authentication | `authentication.test.ts` | Auth bypass and token validation |
| CORS Protection | `cors-bypass.test.ts` | Origin allowlist and security headers |
| Prototype Pollution | `prototype-pollution.test.ts` | `__proto__` and constructor attacks |
| ReDoS Prevention | `redos.test.ts` | Regex denial-of-service mitigation |
| Timing Attacks | `timing-attacks.test.ts` | Constant-time comparison validation |
| Error Leakage | `error-leakage.test.ts` | Path/stack/credential sanitization |
| Config Sync | `config-sync.test.ts` | Security constant synchronization |

Run security tests only:

```bash
npm run test -- src/lib/security
```

### Edge Function Tests (~70 tests)

Located in `supabase/functions/semantic-search/`. Tests for the backend translation pipeline.

```bash
npm run test -- supabase/functions
```

### Component Tests

Behavioral unit tests for UI components in `src/components/*/__tests__/`. Tests verify rendered content, user interactions, and data flow without relying on snapshot comparisons.

```bash
npm run test -- src/components
```

### Page Tests

Tests for page-level components (GuidesIndex, GuidePage) in `src/pages/__tests__/`. Cover rendering, navigation, SEO metadata, structured data, and error states.

```bash
npm run test -- src/pages
```

### Guides Data Tests

Structural and content quality tests for the guides data in `src/data/__tests__/guides.test.ts`. Verify data integrity, SEO metadata quality, cross-references, and difficulty progression.

```bash
npm run test -- src/data/__tests__/guides
```

### Regression Tests

Located in `src/lib/regression/`. Integration tests for caching, virtualization, and analytics.

```bash
npm run test -- src/lib/regression
```

### Live Scryfall Validation (opt-in)

Two suites validate queries and tags against the live Scryfall API:

- `src/lib/scryfall-syntax-validation.test.ts` — 100+ syntax queries
- `src/lib/scryfall-otag-validation.test.ts` — 170+ oracle/art tags

These are **skipped by default** to keep CI deterministic. Enable with:

```bash
RUN_SCRYFALL_LIVE_TESTS=1 npm run test -- src/lib/scryfall-syntax-validation.test.ts src/lib/scryfall-otag-validation.test.ts
```

A dedicated CI job runs these weekly (see `.github/workflows/ci.yml`).

## Security Testing Utilities

The security module exports reusable utilities for custom tests:

```typescript
import {
  containsPrototypePollution,
  sanitizeObjectKeys,
  safeJsonParse,
  sanitizeErrorForClient,
  safeTimingCompare,
  isRegexSafe,
  SECURITY_LIMITS,
} from '@/lib/security';
```

## CI Integration

All tests run automatically on pull requests via GitHub Actions (`.github/workflows/ci.yml`). Security tests are included in the regression suite exported from `src/lib/regression/index.ts`. Live Scryfall validation runs in a separate job on a weekly schedule to avoid flaky builds from external API dependencies.
