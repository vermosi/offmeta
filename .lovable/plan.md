# OffMeta: next phase

Four tracks, sequenced by impact. Each phase ships and verifies independently.

## What the data shows (last 7 days)

- 130 `search_started` → 84 `search_results` → 83 `search_success` → 26 `card_click`
- 432 route views: 222 on `/`, 57 card pages, the rest spread thin across guides, combos, deck-check
- Discord: 11 searches, 5 result-link clicks
- `error_events`: 2 unresolved — "Lock broken by another request with the 'steal' option", "Script error."
- Improvement backlog: every row is marked completed

The ~46-search gap between starting and seeing results is the single biggest leak. What causes it is **not yet confirmed** — the current events don't distinguish abandonment, translation timeout, and render failure. Phase 1 diagnoses before it fixes.

## Phase 1 — Close the search drop-off

1. Add a terminal outcome to every started search: emit one `search_outcome` event with a reason (`results`, `zero_results`, `translate_timeout`, `translate_error`, `scryfall_error`, `abandoned_before_results`, `navigated_away`) plus elapsed time, keyed to the same search id as `search_started`.
2. Add an admin view in the control room that breaks starts down by outcome and p75 time-to-results, so the leak becomes a named number instead of a gap.
3. Fix whatever the top reason turns out to be. Likely candidates, already visible in the code: the 9s client / 8s server translation ceiling, and searches that resolve after the user has already left the page.
4. Re-check the funnel after the fix and record the before/after in the backlog.

## Phase 2 — Deepen card pages and result clicks

Only 26 of 84 result sets produced a card click, and card pages get 57 views a week.

- Make "why it matches" visible in the result grid, not just after opening a card — a one-line reason per card so the grid is scannable.
- On the card page, add a "next step" rail: cheaper alternatives, cards that play with it, and the searches that surfaced it, each as a real query link.
- Track `result_click_position` and `card_page_exit_action` so we can tell whether the rail actually moves users onward.

## Phase 3 — Acquisition beyond the homepage

`/` is over half of all route views; search and card routes barely register as entry points.

- Internal linking pass: every guide links to 3-5 concrete `/search/...` queries, every card page links to its ontology role searches, and `/browse-searches` links back into guides.
- Curated searches: 90 exist; promote the ones with real impressions into indexable landing pages with unique copy, and prune thin ones rather than adding more.
- Distribution: make the Discord result embed and the `/go` bridge worth sharing (card thumbnail, top-3 preview), and add a lightweight "share this search" affordance on results.

## Phase 4 — Reliability cleanup

- Resolve the two open `error_events`, including the job-lock steal, and confirm the watchdog no longer reopens them.
- Give `Script error.` a real fingerprint (cross-origin script errors currently collapse into one useless row).
- Add a self-heal regression guard: a scheduled check that the loop still converges and does not re-process the same issue after the dedupe work.

## Technical notes

- New analytics goes through the existing `useAnalytics` batch-flush path and `analytics_events`; no new table needed for Phase 1 beyond an aggregate RPC for the admin view.
- Search outcome instrumentation lives in `src/lib/search/` and the search hook, not in components, so both the page and Discord paths can report the same reasons.
- Card-page rails reuse the existing ontology and co-occurrence data (`card_ontology`, `card_cooccurrence`) — no new pipelines.
- Every new string goes through i18n keys across all 11 locales.
- Verification per phase: focused tests, `npm run test`, and a live read of the funnel query before declaring a phase done.
