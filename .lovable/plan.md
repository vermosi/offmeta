
# Codebase Cleanup — 2026-02-14

## Completed

- ✅ Fixed mobile hamburger menu (portal approach for stacking context)
- ✅ Verified StaplesSection renders on home page
- ✅ Fixed all lint errors (ArtLightbox, Index, ViewToggle)
- ✅ Moved `view-mode-storage.ts` from `src/components/` to `src/lib/`
- ✅ Deleted duplicate test files (`scryfall-query.test.ts`, `scryfall.test.ts`)
- ✅ Relocated `card-printings.test.ts` → `src/lib/scryfall/printings.test.ts`
- ✅ Relocated `scryfall-syntax.test.ts` → `src/lib/scryfall/syntax.test.ts`

## Pending (requires manual action)

### `.gitignore` — add `.lovable/` directory
The `.gitignore` file is read-only in Lovable. Add this line via GitHub:
```
.lovable/
```
