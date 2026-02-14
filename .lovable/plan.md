
# Sprint 3 Completion + Sprint 4 Start

## What's done so far
- Sprint 1: Shareable URLs, share button, persistent history
- Sprint 2: 5 guide pages with JSON-LD, sitemap
- Sprint 3 partial: Daily Off-Meta Pick

## What we'll build next

### 1. Similar Search Suggestions (Sprint 3 — Task 2.4)
**Goal:** After a search, show 3-5 clickable related query suggestions to increase pages/visit.

**Approach:**
- Create a new `SimilarSearches` component that appears below search results
- Build a mapping of query keywords to related searches (e.g., "ramp" suggests "mana dorks", "land fetch", "cost reduction")
- Use a combination of:
  - Keyword-based suggestions from a curated mapping (e.g., searches containing "treasure" suggest "token doublers", "artifact sacrifice")
  - Guide page cross-links when relevant (e.g., search for "ramp" links to the green ramp guide)
- Render as horizontal scrollable chips below the ExplainCompilationPanel
- Clicking a chip triggers `searchBarRef.current.triggerSearch(suggestion)`

**Files to create/modify:**
- New: `src/data/similar-searches.ts` — curated keyword-to-suggestions mapping
- New: `src/components/SimilarSearches.tsx` — chip-based suggestion row
- Modify: `src/pages/Index.tsx` — add SimilarSearches below results
- Modify: `src/hooks/useSearch.ts` — expose originalQuery for matching

### 2. Save Searches with Authentication (Sprint 3 — Task 2.1)
**Goal:** Let users bookmark searches and revisit them later.

**Approach:**
- Add email/password authentication using Lovable Cloud
- Create a `saved_searches` table with RLS policies
- Add a "Save this search" button next to the share button in EditableQueryBar
- Create a "Saved Searches" section accessible from the header (small bookmark icon)
- Auth UI: simple login/signup dialog (not a separate page — keeps the single-page feel)

**Database:**
- Table: `saved_searches` with columns: `id`, `user_id`, `natural_query`, `scryfall_query`, `created_at`
- RLS: users can only read/write their own saved searches

**Files to create/modify:**
- New: `src/components/AuthDialog.tsx` — login/signup modal
- New: `src/components/SavedSearches.tsx` — saved searches dropdown
- New: `src/hooks/useAuth.ts` — auth state management
- Modify: `src/components/EditableQueryBar.tsx` — add save button
- Modify: `src/pages/Index.tsx` — add auth button to header + saved searches
- Database migration: create `saved_searches` table with RLS

### 3. Dynamic OG Images (Sprint 4 — Task 3.2)
**Goal:** When a search URL is shared on social media, show a rich preview with the query and top card art.

**Approach:**
- Create a backend function that generates OG images on-the-fly
- Use an HTML-to-image approach via the edge function
- The OG image shows: OffMeta logo, the search query text, and a grid of top card thumbnails
- Update the document `<head>` with dynamic `og:image` meta tags pointing to the edge function URL
- Fallback to the static `og-image.png` for non-search pages

**Files to create/modify:**
- New: `supabase/functions/og-image/index.ts` — edge function that returns a PNG
- Modify: `src/hooks/useSearch.ts` — inject OG meta tags dynamically
- Modify: `index.html` — add default OG tags as fallback

---

## Recommended execution order
1. Similar Search Suggestions (standalone, no backend needed, quick win)
2. Authentication + Save Searches (backend + frontend, medium effort)
3. Dynamic OG Images (edge function, can be done independently)

## Technical considerations
- Auth will require email confirmation by default (no auto-confirm)
- Saved searches are capped at ~50 per user to prevent abuse
- OG image generation needs careful caching to avoid excessive edge function calls
- Similar searches use a static mapping first; can be enhanced with AI-generated suggestions later
