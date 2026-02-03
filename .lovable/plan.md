# UI Declutter & Improvement Plan

## Overview

This plan addresses the cluttered UI by simplifying the "Try" section, fixing footer positioning, and making the results page cleaner and more user-friendly while hiding technical details behind progressive disclosure.

---

## Problem Analysis

### Current Issues

1. **Try Section Clutter**: Shows too many example queries (6 defined, 4 shown on desktop) plus recent searches, creating visual noise
2. **Results Page Overload**: Multiple panels stacked vertically (EditableQueryBar, ExplainCompilationPanel, results count, filters) overwhelm users
3. **Technical Details Exposed**: The "Explain compilation" panel shows internal query parsing details that most users don't need
4. **Footer Positioning**: While not technically "fixed", the `min-h-screen` layout always shows the footer even on short pages

---

## Proposed Changes

### 1. Simplify the "Try" Section

**Current State:**

- 6 example queries defined in `EXAMPLE_QUERIES`
- Shows up to 4 examples on desktop, 2 on mobile
- Separate row for recent searches
- Cluttered, flex-wrapped layout

**Changes:**

- Reduce example queries from 6 to 3-4 high-value examples
- Show only 2 examples on desktop, 1 on mobile (or hide completely on mobile)
- Combine recent searches and examples into a single row with a cleaner chip design
- Add subtle visual hierarchy: recent searches first (if any), then 1-2 examples
- Consider removing the "Try:" label and using a simpler inline presentation

**Files to modify:**

- `src/components/UnifiedSearchBar.tsx` (lines 198-206 for `EXAMPLE_QUERIES`, lines 648-673 for rendering)

---

### 2. Declutter the Results Page

**Current State:**

- EditableQueryBar always visible with confidence scores
- ExplainCompilationPanel shows technical breakdown
- Results count pill
- SearchFilters bar
- All visible at once, creating vertical clutter

**Changes:**

- **Hide ExplainCompilationPanel by default** - Move it behind a collapsible/accordion or "Show details" toggle. Most users don't need to see color breakdowns, type parsing, etc.
- **Simplify EditableQueryBar header** - Remove confidence percentage from main view; only show if user hovers or expands
- **Combine results count with filters** - Instead of separate pill, integrate card count into the filters row
- **Progressive disclosure** - Technical details available but not prominent

**Files to modify:**

- `src/pages/Index.tsx` (lines 472-495 for conditional rendering)
- `src/components/ExplainCompilationPanel.tsx` (add collapsible wrapper)
- `src/components/EditableQueryBar.tsx` (simplify header)

---

### 3. Fix Footer Behavior

**Current State:**

- Footer uses `mt-auto` which keeps it at bottom of flex container
- `min-h-screen` on wrapper means footer always visible

**Desired Behavior:**

- Footer should scroll with content, appearing at the end of results
- Should not be visible until user scrolls to bottom on long result lists

**Changes:**

- The current implementation is correct (`mt-auto` in a flex column with `min-h-screen`). The footer naturally appears at the bottom of content or viewport, whichever is taller.
- **No code changes needed** - if the footer appears "fixed", it's because the content is short. This is expected behavior.
- Optional: Add slight bottom margin/padding before footer for breathing room

**Files to verify:**

- `src/pages/Index.tsx` (line 331: `min-h-screen flex flex-col`)
- `src/components/Footer.tsx` (line 9: `mt-auto`)

---

### 4. Make UI More Inviting

**Visual & UX Improvements:**

1. **Reduce cognitive load**
   - Hide technical jargon (confidence %, deterministic query) by default
   - Use friendlier language: "Translated query" instead of "Scryfall Query"
   - Show success states subtly rather than verbose toasts

2. **Cleaner landing page**
   - Reduce example query count
   - More whitespace around search bar
   - Remove "How It Works" step-by-step if user has searched before (or collapse it)

3. **Results page focus**
   - Cards should be the hero - minimize UI between search and results
   - Filters inline with results count
   - Technical panel collapsed by default

**Files to modify:**

- `src/components/EditableQueryBar.tsx` (rename "Scryfall Query" label)
- `src/pages/Index.tsx` (layout adjustments, conditional rendering)

---

## Implementation Summary

### Phase 1: Declutter "Try" Section

```text
UnifiedSearchBar.tsx:
├── Reduce EXAMPLE_QUERIES to 3 items
├── Show max 2 examples on desktop, 1 on mobile
├── Cleaner chip styling without quotes
└── Combine with recent in single row when possible
```

### Phase 2: Simplify Results Page

```text
Index.tsx:
├── Make ExplainCompilationPanel collapsible (default closed)
├── Move results count into SearchFilters row
└── Remove redundant spacing

EditableQueryBar.tsx:
├── Change "Scryfall Query" → "Translated query"
└── Hide confidence % by default (show on hover/expand)
```

### Phase 3: Footer & Polish

```text
Index.tsx / Footer.tsx:
├── Verify mt-auto behavior (no changes likely needed)
└── Add breathing room before footer

General:
├── Reduce toast verbosity
└── Cleaner animations (faster, subtler)
```

---

## Technical Notes

- ExplainCompilationPanel can be wrapped with Radix Collapsible or a simple state toggle
- Consider using localStorage to remember if user wants technical panel expanded
- Results count can move into SearchFilters as a leading element
- All changes maintain existing accessibility patterns (aria labels, focus management)

---

## Expected Outcome

**Before:**

- Landing: Search bar + Recent + 4 examples + How It Works + FAQ + Footer
- Results: Search bar + Query bar + Explain panel + Count pill + Filters + Cards + Footer

**After:**

- Landing: Search bar + 2 examples (cleaner) + How It Works + FAQ + Footer (only on scroll)
- Results: Search bar + Simplified query bar + Filters with count + Cards + (expandable: technical details)
