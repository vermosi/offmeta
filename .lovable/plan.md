
# Codebase Cleanup and Y Combinator-Readiness Plan

## Executive Summary
This plan addresses file organization, package bloat, deprecated code cleanup, README polish, and documentation consistency to elevate OffMeta to a professional, investor-ready state.

---

## Phase 1: Package.json Cleanup

### 1.1 Rename Package
**Current:** `"name": "vite_react_shadcn_ts"` (generic boilerplate name)
**Change to:** `"name": "offmeta"`

### 1.2 Add Semantic Versioning
**Current:** `"version": "0.0.0"`
**Change to:** `"version": "1.0.0"` (production-ready indicator)

### 1.3 Add Missing Metadata
Add these fields for npm/GitHub visibility:
```json
{
  "description": "Natural language Magic: The Gathering card search powered by Scryfall",
  "author": "OffMeta <hello@offmeta.app>",
  "homepage": "https://offmeta.app",
  "repository": {
    "type": "git",
    "url": "https://github.com/vermosi/offmeta.git"
  },
  "bugs": {
    "url": "https://github.com/vermosi/offmeta/issues"
  },
  "keywords": ["mtg", "magic-the-gathering", "scryfall", "card-search", "natural-language"]
}
```

### 1.4 Move Misplaced Dependencies
These belong in `devDependencies`, not `dependencies`:
- `@testing-library/dom`
- `@testing-library/jest-dom`
- `@testing-library/react`
- `jsdom`
- `eslint-plugin-check-file`

### 1.5 Remove Unused UI Component Dependencies
Based on import analysis, these Radix packages are installed but **not used anywhere**:
- `@radix-ui/react-accordion` - not imported
- `@radix-ui/react-alert-dialog` - not imported
- `@radix-ui/react-aspect-ratio` - not imported
- `@radix-ui/react-avatar` - not imported
- `@radix-ui/react-context-menu` - not imported
- `@radix-ui/react-hover-card` - not imported
- `@radix-ui/react-menubar` - not imported
- `@radix-ui/react-navigation-menu` - not imported
- `@radix-ui/react-radio-group` - not imported
- `@radix-ui/react-switch` - not imported

### 1.6 Remove Unused Feature Dependencies
These packages have components but are **never imported in app code**:
- `embla-carousel-react` (only in unused `carousel.tsx`)
- `recharts` (only in unused `chart.tsx`)
- `react-day-picker` (only in unused `calendar.tsx`)
- `input-otp` (only in unused `input-otp.tsx`)
- `react-resizable-panels` (only in unused `resizable.tsx`)

---

## Phase 2: Remove Unused UI Components

Delete these shadcn/ui components that have zero imports:
```
src/components/ui/accordion.tsx
src/components/ui/alert-dialog.tsx
src/components/ui/alert.tsx
src/components/ui/aspect-ratio.tsx
src/components/ui/avatar.tsx
src/components/ui/breadcrumb.tsx
src/components/ui/calendar.tsx
src/components/ui/carousel.tsx
src/components/ui/chart.tsx
src/components/ui/context-menu.tsx
src/components/ui/hover-card.tsx
src/components/ui/input-otp.tsx
src/components/ui/menubar.tsx
src/components/ui/navigation-menu.tsx
src/components/ui/pagination.tsx
src/components/ui/progress.tsx
src/components/ui/radio-group.tsx
src/components/ui/resizable.tsx
src/components/ui/sidebar.tsx
src/components/ui/switch.tsx
src/components/ui/table.tsx
```

**Estimated bundle reduction:** 80-100KB

---

## Phase 3: Remove Deprecated Re-export Files

These files exist only as deprecated wrappers and should be deleted. All imports will be updated to use the canonical paths:

| Deprecated File | Canonical Import |
|-----------------|------------------|
| `src/lib/card-printings.ts` | `@/lib/scryfall/printings` |
| `src/lib/scryfall.ts` | `@/lib/scryfall/client` |
| `src/lib/utils.ts` | `@/lib/core/utils` |
| `src/lib/logger.ts` | `@/lib/core/logger` |
| `src/lib/pwa.ts` | `@/lib/pwa/register` |
| `src/lib/query-filters.ts` | `@/lib/search/filters` |

### Import Updates Required
- Update 55+ files importing from `@/lib/utils` to use `@/lib/core/utils`
- Update 8 files importing from `@/lib/scryfall` to use `@/lib/scryfall/client`
- Update 2 files importing from `@/lib/card-printings` to use `@/lib/scryfall/printings`
- Update 1 file importing from `@/lib/pwa` to use `@/lib/pwa/register`

---

## Phase 4: Consolidate Test Files

### 4.1 Move Orphaned Test Files
These test files are in `src/lib/` but test edge function code:
- `src/lib/search/deterministic.test.ts` - tests `supabase/functions/semantic-search/deterministic`
- `src/lib/edge-functions-shared.test.ts` - tests `supabase/functions/_shared/`

**Action:** Keep in place but add clear module documentation headers.

### 4.2 Remove Duplicate Test File
- `src/lib/env.test.ts` duplicates `src/lib/core/env.test.ts`
- Delete `src/lib/env.test.ts`

---

## Phase 5: README Overhaul

### 5.1 Fix Incorrect Badges
**Current issues:**
- Vite badge shows "5" but project uses Vite 7.3.1
- Badge layout could use dynamic GitHub badges

### 5.2 Add Dynamic Badges
Replace static badges with dynamic ones:
```markdown
[![CI](https://github.com/vermosi/offmeta/actions/workflows/ci.yml/badge.svg)](https://github.com/vermosi/offmeta/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/vermosi/offmeta)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/vermosi/offmeta?style=social)](https://github.com/vermosi/offmeta)
```

### 5.3 Add Test Count Badge
```markdown
[![Tests](https://img.shields.io/badge/tests-600%2B-brightgreen)](docs/testing.md)
```

### 5.4 Improve Feature Section
Add quantifiable metrics:
```markdown
- 200+ deterministic translation patterns
- 300+ security tests
- 70+ regression tests
- Sub-100ms client-side query caching
```

### 5.5 Add Architecture Diagram Preview
Include mermaid diagram directly in README (already exists, just ensure visibility)

### 5.6 Add "Built for Production" Section
Highlight enterprise-grade features:
- Rate limiting and abuse prevention
- CORS protection
- Error sanitization
- Offline-first PWA support

---

## Phase 6: Documentation Consistency

### 6.1 Update Version References
- Fix Vite version in README badges (5 to 7)
- Ensure `.nvmrc` version matches package.json engines

### 6.2 Add CHANGELOG entries
Document recent security and organization changes

### 6.3 Consolidate Duplicate Docs
- `docs/development.md` overlaps with `CONTRIBUTING.md`
- Consider merging or cross-referencing

---

## Phase 7: File Naming Enforcement

### 7.1 Already Correct
- Components: PascalCase (enforced)
- Hooks: camelCase with `use` prefix (enforced)
- UI components: kebab-case (enforced)
- Types: kebab-case (enforced)

### 7.2 Edge Cases to Address
No remaining violations after previous cleanup pass.

---

## Phase 8: CI/CD Enhancements

### 8.1 Add Coverage Badge
Update CI to publish coverage reports and add badge:
```yaml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v4
```

### 8.2 Add Bundle Size Check
Consider adding `size-limit` to track bundle size regressions:
```json
"size-limit": [
  { "path": "dist/assets/*.js", "limit": "250 KB" }
]
```

---

## Implementation Order

1. **Package.json cleanup** (dependencies, metadata)
2. **Delete unused UI components** (22 files)
3. **Update imports** from deprecated paths
4. **Delete deprecated re-export files** (6 files)
5. **Delete duplicate test file**
6. **Update README badges and content**
7. **Verify all tests pass**
8. **Run final lint check**

---

## Technical Details

### Files to Delete (29 total)
```
src/components/ui/accordion.tsx
src/components/ui/alert-dialog.tsx
src/components/ui/alert.tsx
src/components/ui/aspect-ratio.tsx
src/components/ui/avatar.tsx
src/components/ui/breadcrumb.tsx
src/components/ui/calendar.tsx
src/components/ui/carousel.tsx
src/components/ui/chart.tsx
src/components/ui/context-menu.tsx
src/components/ui/hover-card.tsx
src/components/ui/input-otp.tsx
src/components/ui/menubar.tsx
src/components/ui/navigation-menu.tsx
src/components/ui/pagination.tsx
src/components/ui/progress.tsx
src/components/ui/radio-group.tsx
src/components/ui/resizable.tsx
src/components/ui/sidebar.tsx
src/components/ui/switch.tsx
src/components/ui/table.tsx
src/lib/card-printings.ts
src/lib/scryfall.ts
src/lib/utils.ts
src/lib/logger.ts
src/lib/pwa.ts
src/lib/query-filters.ts
src/lib/env.test.ts
```

### Dependencies to Remove (15 packages)
```
@radix-ui/react-accordion
@radix-ui/react-alert-dialog
@radix-ui/react-aspect-ratio
@radix-ui/react-avatar
@radix-ui/react-context-menu
@radix-ui/react-hover-card
@radix-ui/react-menubar
@radix-ui/react-navigation-menu
@radix-ui/react-radio-group
@radix-ui/react-switch
embla-carousel-react
recharts
react-day-picker
input-otp
react-resizable-panels
```

### Dependencies to Move to devDependencies (5 packages)
```
@testing-library/dom
@testing-library/jest-dom
@testing-library/react
jsdom
eslint-plugin-check-file
```

### Files Requiring Import Updates (~60 files)
All files importing from `@/lib/utils` will be updated to `@/lib/core/utils`

---

## Expected Outcomes
- Bundle size reduction: ~100KB
- Package count reduction: -15 production dependencies
- Codebase file reduction: -29 files
- Professional package.json with proper metadata
- Dynamic badges showing live CI status
- Clean, canonical import paths throughout
