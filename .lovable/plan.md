
# Remove Snapshot Tests and Pivot to Data-Driven Component Testing

## Overview
This plan removes all snapshot tests from the codebase and updates documentation to reflect a pure data testing strategy. Snapshot tests have proven unreliable due to CI cache inconsistencies, causing 41 failures that require manual intervention rather than catching real bugs.

## Why Remove Snapshots?

**Problems identified:**
- CI cache mismatches cause false failures unrelated to actual code changes
- Snapshots test implementation details (HTML structure) rather than behavior
- Updating snapshots becomes a routine chore rather than a meaningful validation step
- Hard to review snapshot diffs in PRs (thousands of lines of HTML)

**Better alternative:**
The existing unit tests (e.g., `CardModalDetails.test.tsx`, `CardModalToolbox.test.tsx`) already provide strong coverage using behavioral assertions:
- `expect(getByText('Lightning Bolt')).toBeInTheDocument()`
- `expect(windowOpenSpy).toHaveBeenCalledWith(...)`
- `expect(getByTestId('mana-cost')).toHaveTextContent('{R}')`

These tests are stable, readable, and test what users actually care about.

---

## Files to Delete

### Snapshot Test Files (7 files)
```text
src/components/CardModal/__tests__/CardModalDetails.snapshot.test.tsx
src/components/CardModal/__tests__/CardModalImage.snapshot.test.tsx
src/components/CardModal/__tests__/CardModalLegalities.snapshot.test.tsx
src/components/CardModal/__tests__/CardModalPrintings.snapshot.test.tsx
src/components/CardModal/__tests__/CardModalPurchaseLinks.snapshot.test.tsx
src/components/CardModal/__tests__/CardModalRulings.snapshot.test.tsx
src/components/CardModal/__tests__/CardModalToolbox.snapshot.test.tsx
```

### Snapshot Files Directory (7 .snap files)
```text
src/components/CardModal/__tests__/__snapshots__/CardModalDetails.snapshot.test.tsx.snap
src/components/CardModal/__tests__/__snapshots__/CardModalImage.snapshot.test.tsx.snap
src/components/CardModal/__tests__/__snapshots__/CardModalLegalities.snapshot.test.tsx.snap
src/components/CardModal/__tests__/__snapshots__/CardModalPrintings.snapshot.test.tsx.snap
src/components/CardModal/__tests__/__snapshots__/CardModalPurchaseLinks.snapshot.test.tsx.snap
src/components/CardModal/__tests__/__snapshots__/CardModalRulings.snapshot.test.tsx.snap
src/components/CardModal/__tests__/__snapshots__/CardModalToolbox.snapshot.test.tsx.snap
```

**Total: 14 files removed**

---

## Documentation Update

### Update `docs/testing.md`

Replace lines 66-72:

**Before:**
```markdown
### Component Tests

Snapshot and unit tests for UI components in `src/components/*/__tests__/`.

```bash
npm run test -- src/components
```
```

**After:**
```markdown
### Component Tests

Behavioral unit tests for UI components in `src/components/*/__tests__/`. Tests verify rendered content, user interactions, and data flow without relying on snapshot comparisons.

```bash
npm run test -- src/components
```
```

---

## Test Count Impact

| Category | Before | After |
|----------|--------|-------|
| Snapshot tests | 41 | 0 |
| Component unit tests | ~82 | ~82 (unchanged) |
| Total test count | ~850 | ~809 |

The remaining unit tests provide equivalent or better coverage:
- `CardModalDetails.test.tsx` - 14 tests covering name, mana, type, oracle text, rarity, artist, reserved badge, printing badges, power/toughness, flavor text, mobile styling
- `CardModalToolbox.test.tsx` - 14 tests covering links, URL generation, click handlers, mobile/desktop views
- Similar coverage exists for other modal components

---

## Technical Details

### Implementation Steps
1. Delete all 7 `*.snapshot.test.tsx` files
2. Delete the `__snapshots__/` directory with all 7 `.snap` files
3. Update `docs/testing.md` to remove snapshot references
4. Run `npm run test` to verify remaining tests pass
5. Run `npm run lint` to verify no linting errors

### No Configuration Changes Needed
- `vite.config.ts` has no snapshot-specific settings
- Test setup in `src/test/setup.ts` doesn't reference snapshots
- CI workflow (`.github/workflows/ci.yml`) runs all tests without snapshot-specific flags

### Resulting Test Structure
```text
src/components/CardModal/__tests__/
  ├── CardModalDetails.test.tsx       (14 behavioral tests)
  ├── CardModalImage.test.tsx         (8 behavioral tests)
  ├── CardModalLegalities.test.tsx    (behavioral tests)
  ├── CardModalPrintings.test.tsx     (behavioral tests)
  ├── CardModalPurchaseLinks.test.tsx (behavioral tests)
  ├── CardModalRulings.test.tsx       (behavioral tests)
  └── CardModalToolbox.test.tsx       (14 behavioral tests)
```

---

## Future Testing Strategy

**Focus on data-driven testing:**
- Golden tests for translation accuracy (200+ tests)
- Security tests for input validation (300+ tests)
- API validation tests against live Scryfall (170+ tests)
- Component behavior tests (DOM queries, interactions)
- Edge function integration tests (70+ tests)

**Avoid:**
- Snapshot tests (brittle, hard to review, cache-sensitive)
- Implementation-detail tests (CSS class names, exact HTML structure)
