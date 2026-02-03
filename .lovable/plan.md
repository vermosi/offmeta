# Codebase Cleanup and Y Combinator-Readiness Plan

## Status: ✅ COMPLETED

This plan has been executed successfully on 2026-02-03.

---

## Summary of Changes

### Phase 1: Dependencies ✅
- Removed 14 unused packages:
  - `@radix-ui/react-alert-dialog`
  - `@radix-ui/react-aspect-ratio`
  - `@radix-ui/react-avatar`
  - `@radix-ui/react-context-menu`
  - `@radix-ui/react-hover-card`
  - `@radix-ui/react-menubar`
  - `@radix-ui/react-navigation-menu`
  - `@radix-ui/react-radio-group`
  - `@radix-ui/react-switch`
  - `embla-carousel-react`
  - `recharts`
  - `react-day-picker`
  - `input-otp`
  - `react-resizable-panels`
- Kept `@radix-ui/react-accordion` (used by FAQSection)

### Phase 2: Unused UI Components ✅
Deleted 20 unused shadcn/ui components:
- alert-dialog, alert, aspect-ratio, avatar, breadcrumb
- calendar, carousel, chart, context-menu, hover-card
- input-otp, menubar, navigation-menu, pagination
- progress, radio-group, resizable, sidebar, switch, table

Restored accordion (used by FAQSection).

### Phase 3: Import Path Updates ✅
- Updated imports from `@/lib/scryfall` → `@/lib/scryfall/client`
- Updated imports from `@/lib/card-printings` → `@/lib/scryfall/printings`
- Updated imports from `@/lib/pwa` → `@/lib/pwa/register`
- Kept `@/lib/utils` as a simple re-export for backwards compatibility (50+ files depend on it)

### Phase 4: Deprecated Files ✅
- Deleted `src/lib/card-printings.ts` (wrapper)
- Deleted `src/lib/scryfall.ts` (wrapper)
- Deleted `src/lib/logger.ts` (wrapper)
- Deleted `src/lib/pwa.ts` (wrapper)
- Deleted `src/lib/query-filters.ts` (wrapper)
- Deleted `src/lib/env.test.ts` (duplicate)

### Phase 5: README Overhaul ✅
- Added dynamic CI badge from GitHub Actions
- Fixed Vite version badge (5 → 7)
- Added test count badge (600+)
- Added "Built for Production" section with security highlights
- Improved formatting with tables and sections
- Added architecture diagram

---

## Results

| Metric | Before | After |
|--------|--------|-------|
| Production dependencies | ~55 | ~41 |
| UI component files | 41 | 21 |
| Deprecated wrapper files | 6 | 0 |
| Bundle size (estimated) | ~350KB | ~250KB |

---

## Future Improvements (Not Implemented)

These items were scoped but not executed in this pass:

1. **Package.json metadata**: Rename from `vite_react_shadcn_ts` to `offmeta`, add version 1.0.0, add repository/author fields
   - *Reason*: Package.json is read-only in Lovable

2. **Move test dependencies**: Move @testing-library/* and jsdom to devDependencies
   - *Reason*: Package.json is read-only in Lovable

3. **Codecov integration**: Add coverage badge and upload step
   - *Reason*: Out of scope for cleanup, planned for CI/CD phase

4. **Bundle size tracking**: Add size-limit package
   - *Reason*: Out of scope for cleanup, planned for CI/CD phase
