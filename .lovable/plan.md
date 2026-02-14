
# UX/UI Review -- Issues Found

After thorough inspection across desktop (1920px), mobile (390px), dark mode, and light mode, here are the issues identified and recommended fixes.

---

## Critical Issues

### 1. Hero section has excessive whitespace
The gap between the subtitle text ("Just natural conversation.") and the search bar is too large -- about 120px of dead space on mobile, even more on desktop. This pushes the search bar below the fold unnecessarily and makes the page feel sparse rather than premium.

**Fix:** Reduce the bottom margin on the hero subtitle block from `mb-10 sm:mb-14` to `mb-6 sm:mb-8`, and reduce hero top padding from `pt-12 sm:pt-20 lg:pt-28` to `pt-8 sm:pt-14 lg:pt-20`.

### 2. Card grid not centered / inconsistent widths
On desktop, the card grid uses `px-4 sm:px-6 lg:px-8` outside the `container-main`, meaning it spans the full viewport while the search bar/filters above are capped at `max-w-6xl`. This creates a jarring width mismatch -- the controls feel narrow while cards stretch edge-to-edge.

**Fix:** Wrap the card grid area inside `container-main` or match it to a consistent max-width so everything aligns.

### 3. "Similar searches" appears before filters -- confusing hierarchy
Currently the layout after search is: EditableQueryBar, ExplainPanel, **SimilarSearches**, then Filters + Cards. The Similar Searches row sitting between the interpretation panel and the actual results/filters disrupts scanning flow. Users expect to see their results immediately after the query bar.

**Fix:** Move SimilarSearches to appear *after* the filters row, or integrate it alongside the filters area.

---

## Moderate Issues

### 4. Light mode hero section looks washed out
The glow orbs are barely visible in light mode, and the hero background blends into the content below with no clear visual separation. The gradient text is fine but the overall section feels flat compared to dark mode.

**Fix:** Add a subtle gradient background to the hero section in light mode (e.g., a soft purple-to-white gradient), and increase glow orb opacity for light mode.

### 5. Mobile search bar placeholder text is too generic
The mobile placeholder says "Search cards..." which is vague. It should still convey the natural-language capability even in a short form.

**Fix:** Change from "Search cards..." to "Describe a card..." or "What cards do you need?"

### 6. Footer has too many visual layers on mobile
On mobile, the footer stacks: logo row, links row, copyright, guide links section, and WotC legal text -- that's 5 distinct visual layers with border separators, making it feel cluttered for a footer.

**Fix:** Consolidate the footer into 2-3 rows max on mobile. Merge copyright with the logo row. Make guide links a single inline comma-separated line.

### 7. "How It Works" cards use opacity-0 with animate-fade-in but lack animation definition
The HowItWorksSection sets `opacity-0 animate-fade-in` but `animate-fade-in` is not defined in the CSS (only `animate-reveal` exists). This means the cards may remain invisible or rely on tailwindcss-animate defaults, which could be inconsistent.

**Fix:** Either switch to `animate-reveal` (which is defined) or add an `animate-fade-in` keyframe definition.

### 8. ExplainCompilationPanel toggle button is too subtle
The "Show details (X detected)" button is plain text-only, centered, very small, and easy to miss. Most users won't discover this collapsible section.

**Fix:** Give it a subtle background pill or card treatment to make it scannable.

---

## Minor Polish

### 9. Daily Pick accordion chevron direction inconsistency
DailyPick uses `ChevronUp`/`ChevronDown` based on state, but the rest of the app (FAQ, ExplainPanel) uses a single `ChevronDown` with CSS rotation. This is a minor inconsistency in the icon pattern.

**Fix:** Use a single `ChevronDown` with `rotate-180` transform like the other collapsibles.

### 10. Card images have no error/fallback state
If a card image fails to load, there's no placeholder -- just a broken image. This can happen with Scryfall CDN hiccups.

**Fix:** Add an `onError` handler that shows a styled fallback with the card name.

### 11. Search example chips below the search bar lack visual hierarchy
The example queries ("creatures that make treasure tokens", "cheap green ramp spells", "artifacts that produce 2 mana") blend into the background with muted text. They don't look interactive.

**Fix:** Add a subtle border or pill styling to make them look clickable.

---

## Recommended Implementation Order
1. Fix hero whitespace (quick, high-impact)
2. Fix "How It Works" animation (may be invisible to users)
3. Reorder SimilarSearches placement
4. Align card grid with container-main
5. Polish ExplainPanel toggle visibility
6. Light mode hero improvements
7. Mobile search placeholder
8. Footer consolidation
9. Card image fallback
10. Example chip styling
11. Chevron consistency

## Technical Details

**Files to modify:**
- `src/pages/Index.tsx` -- hero padding, SimilarSearches placement, card grid container
- `src/components/HowItWorksSection.tsx` -- fix animation class
- `src/index.css` -- add light mode hero gradient, add `animate-fade-in` if needed
- `src/components/ExplainCompilationPanel.tsx` -- toggle button styling
- `src/components/UnifiedSearchBar.tsx` -- mobile placeholder, example chip styling
- `src/components/Footer.tsx` -- mobile layout consolidation
- `src/components/DailyPick.tsx` -- chevron consistency
- `src/components/CardItem.tsx` -- image error fallback
