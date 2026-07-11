# Testing

This page is the quick index for the canonical test surface.

## Canonical commands

```bash
npm run test
npm run test:watch
npm run test -- --coverage
```

## Test areas

- [Security tests](../README.md#built-for-production)
- [Edge-function tests](../supabase/functions/semantic-search/index.test.ts)
- [Semantic-search contract helpers](../src/lib/search/__tests__/edge-contract.test.ts)
- [Component tests](../src/components)
- [Page tests](../src/pages)
- [Regression tests](../src/lib/regression)
- [E2E and accessibility](../README.md#built-for-production)
- [Live Scryfall validation](../README.md#built-for-production)

## CI notes

For current CI behavior, branch protection, and smoke coverage, see the testing section in [README.md](../README.md) and the active workflows in `.github/workflows/`.
