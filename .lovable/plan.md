

# Everything We Can Add Without Authentication

A comprehensive plan of features that enhance OffMeta using only anonymous/session-based storage (localStorage, sessionStorage, URL state) and public database tables -- no sign-in required.

---

## 1. Search History Persistence (localStorage)

**What**: Persist recent searches across browser sessions (currently session-only via `SearchHistoryDropdown`).

**How**: Store the last 20 searches in `localStorage` instead of (or in addition to) `sessionStorage`. Add import/export as JSON for portability.

**Effort**: Small

---

## 2. Card Comparison View

**What**: Let users select 2-4 cards from search results and view them side-by-side, comparing stats (CMC, power/toughness, price, legalities, oracle text).

**How**: Add a "Compare" toggle that enables multi-select checkboxes on `CardItem`. A floating bar shows selected count and opens a comparison modal/page.

**Effort**: Medium

---

## 3. Shareable Search Links with Filters

**What**: Encode active filters (colors, types, CMC range, sort) into the URL so users can share filtered results.

**How**: Extend the existing `?q=` URL param to include filter state (e.g., `?q=draw+spells&colors=U,B&sort=price-asc`). Parse on load in `useSearch`.

**Effort**: Small

---

## 4. View Toggle: Grid vs List vs Image-Only

**What**: Let users switch between card display modes -- the current grid, a compact list (name + type + price per row), and an image-only gallery.

**How**: Add a `ToggleGroup` next to the sort/filter bar. Persist preference in `localStorage`. Create a `CardListItem` component for the list view.

**Effort**: Medium

---

## 5. Random Card Discovery

**What**: A "Surprise Me" button on the home page that fetches a random card from Scryfall (`/cards/random`) and opens it in the modal. Optionally filter by color/type.

**How**: Call `https://api.scryfall.com/cards/random?q=...` with optional filters. Add button near Daily Pick or search bar.

**Effort**: Small

---

## 6. Export Search Results

**What**: Let users export current search results as CSV or copy a card name list to clipboard (useful for deck building on other platforms).

**How**: Add "Export" dropdown next to filters with options: "Copy names", "Download CSV" (name, set, price, type, CMC).

**Effort**: Small

---

## 7. Advanced Search Builder (Visual)

**What**: A form-based query builder that lets users construct Scryfall queries visually -- pick colors, types, CMC range, keywords, format, price range -- without knowing syntax.

**How**: New page/modal at `/advanced`. Each field maps to a Scryfall syntax fragment. Assemble and redirect to `/?q=...`.

**Effort**: Medium-Large

---

## 8. Price Alerts via Browser Notifications (PWA)

**What**: Users can "watch" a card price. The PWA service worker periodically checks and sends a browser notification if price drops below target.

**How**: Store watchlist in `localStorage`. Use the existing PWA setup (`vite-plugin-pwa`) to add a periodic sync or check on app open.

**Effort**: Medium

---

## 9. Deck Paste-and-Analyze

**What**: Users paste a decklist (one card name per line, MTGO/Arena format), and the app fetches all cards from Scryfall, showing mana curve, color distribution, price total, and category breakdown.

**How**: New `/analyze` route. Parse input, batch-fetch via Scryfall collection endpoint (`/cards/collection`), render charts using simple CSS/SVG (no charting lib needed).

**Effort**: Medium-Large

---

## 10. Keyboard Shortcuts

**What**: Power-user shortcuts: `/` to focus search, `Esc` to close modals, arrow keys to navigate results, `Enter` to open card, `c` to copy card name.

**How**: Global `useEffect` with `keydown` listener. Show shortcut hints in a `?` help modal.

**Effort**: Small

---

## 11. "Staples For" Quick Lookup

**What**: Pre-built buttons/chips like "Staples for: Mono-Red Aggro", "Staples for: Simic Ramp" that run curated Scryfall queries.

**How**: Extend the existing `similar-searches.ts` data with archetype-specific query sets. Show as a section on the home page or as filter presets.

**Effort**: Small

---

## 12. Card Art Zoom / Full-Screen Gallery

**What**: Click card art to view full-resolution art crop in a lightbox. Swipe/arrow between cards in current results.

**How**: Use the `art_crop` image URI from Scryfall. Add a lightbox overlay with keyboard and swipe navigation.

**Effort**: Small-Medium

---

## 13. Color Pie / Mana Curve Visualization for Results

**What**: Show a small stats bar above results: color distribution pie, mana curve histogram, rarity breakdown, average price.

**How**: Compute from `displayCards` array. Render with simple CSS bars (no external chart lib). Collapsible panel.

**Effort**: Medium

---

## 14. Offline Recent Cards (PWA Cache)

**What**: Cache the last 50 viewed card details for offline access via the service worker.

**How**: Extend the existing PWA config to cache Scryfall API responses for recently viewed cards. Show "offline" badge when serving from cache.

**Effort**: Medium

---

## 15. Installable PWA Prompt

**What**: Show a dismissible "Install OffMeta" banner for supported browsers, improving the app-like experience.

**How**: Listen for `beforeinstallprompt` event. Show a tasteful banner near the footer or header. Dismiss state saved in `localStorage`.

**Effort**: Small

---

## Priority Ranking

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 1 | Keyboard Shortcuts | Small | High (power users) |
| 2 | View Toggle (Grid/List/Gallery) | Medium | High (usability) |
| 3 | Shareable Filter URLs | Small | High (sharing) |
| 4 | Export Search Results | Small | High (utility) |
| 5 | Search History Persistence | Small | Medium (convenience) |
| 6 | Random Card Discovery | Small | Medium (engagement) |
| 7 | Color Pie / Mana Curve Stats | Medium | Medium (insight) |
| 8 | Card Art Zoom / Gallery | Small-Med | Medium (visual) |
| 9 | Card Comparison View | Medium | Medium (decision) |
| 10 | Installable PWA Prompt | Small | Medium (retention) |
| 11 | "Staples For" Quick Lookup | Small | Medium (discovery) |
| 12 | Advanced Search Builder | Med-Large | High (accessibility) |
| 13 | Deck Paste-and-Analyze | Med-Large | High (utility) |
| 14 | Offline Recent Cards | Medium | Low-Med (niche) |
| 15 | Price Alerts (Browser) | Medium | Low-Med (niche) |

---

## Technical Notes

- All features use **localStorage/sessionStorage** for persistence -- no auth needed.
- Scryfall API is the sole data source; respect their rate limits (100ms between requests).
- Existing patterns to follow: `useSearch` hook for state, `CLIENT_CONFIG` for constants, `useAnalytics` for tracking, shadcn/ui components for UI.
- New routes (if any) register in `src/App.tsx` under the existing `Routes`.
- Analytics events for new features insert into the public `analytics_events` table (already has permissive insert policy).

