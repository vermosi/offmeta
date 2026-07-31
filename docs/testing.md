# Testing

This page describes the canonical test surface for OffMeta. The repo mixes unit tests, integration tests, end-to-end checks, and accessibility coverage, so the goal here is to make it obvious which layer to use and why.

## Canonical Commands

```bash
npm run test
npm run test:watch
npm run test -- --coverage
```

If you are touching a small area, run the narrowest relevant tests first. If you are changing shared search, auth, or routing code, widen the scope before merging.

## Test Areas

- `src/tests/static/raw-tailwind-colors.test.ts` - guardrails for styling conventions
- `src/tests/api/edge-function.test.ts` - API and edge-function behavior
- `src/hooks/__tests__/` - hook logic and state transitions
- `src/pages/__tests__/` - page-level behavior and route coverage
- `src/components/` - component tests and interaction checks
- `src/lib/search/` - search pipeline helpers and contract validation
- `src/lib/security/` - security and authorization utilities
- `src/tests/e2e/` - end-to-end user flows and accessibility smoke tests

The broad pattern is simple: fast tests protect the pure logic, while e2e tests protect the real user journeys.

## CI Integration

The CI setup is intentionally layered so that the most important regressions fail early.

- unit and integration tests cover the main application logic
- e2e smoke coverage protects navigation and the highest-value user paths
- accessibility checks catch regressions in the core routes
- broader browser coverage validates the end-to-end experience over time

For workflow details, inspect the active jobs in `.github/workflows/`.

## What To Run For Common Changes

- Search UI changes: `src/hooks/__tests__/`, `src/pages/__tests__/`, `src/tests/e2e/search.spec.ts`
- Auth and session changes: `src/hooks/__tests__/useAuth.test.ts`, auth-related page specs, relevant e2e auth flows
- Security changes: `npm run test -- src/lib/security`
- Edge-function changes: `src/tests/api/edge-function.test.ts` and the function-specific tests
- Navigation changes: `src/tests/e2e/navigation.spec.ts`
- Accessibility-sensitive changes: `src/tests/e2e/a11y-smoke.spec.ts`

## Test Philosophy

- Prefer deterministic tests over snapshot-heavy ones.
- Test the behavior that matters to users, not the implementation detail that happened to exist yesterday.
- Keep fixtures small and realistic.
- When a bug escapes, add the smallest regression test that would have caught it.

## Related References

- [README.md](../README.md) - top-level build and product overview
- [Architecture](./architecture.md) - explains the major code boundaries
- [Development](./development.md) - local setup and workflow
