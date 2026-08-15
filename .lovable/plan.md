# What's left after Phase 1

Phase 1 telemetry and the Phase 4 error-noise cleanup are in. Grid tiles now carry the "why it matches" caption. Below is the remaining work, in order.

## Status check

- `analytics_events` has zero `search_outcome` rows in the last 3 days, so the drop-off diagnosis is instrumented but not yet answered. The panel needs live traffic before it can name the top reason.
- `CardAlternativesGrid` and `SearchNextStepsBar` exist in the codebase but are not imported anywhere — the card page renders only `CardDetailView`, with no next-step rail.
- Guides currently link back to search in one place only (`GuidesIndex`), so the internal-linking pass from Phase 3 has not started.

## Step 1 — Publish, then read the funnel

Publish so the outcome events start landing, wait for a day of traffic, then read the outcome breakdown and p75 time-to-results in the admin control room. The fix in Phase 1 step 3 is chosen from that number, not guessed. If timeouts dominate, the work is in the translation path; if `abandoned_before_results` dominates, it is a perceived-speed problem and belongs with the progress indicator.

## Step 2 — Card page next-step rail (Phase 2)

Add a rail under the card detail entry with three groups, each a real query link:

- Cheaper alternatives — reuse the existing alternatives logic.
- Plays well with — from `card_cooccurrence` via `get_card_recommendations`.
- Searches that surface it — from `card_ontology` role tags.

Wire up the two orphaned components rather than writing new ones, or delete whichever no longer fits. Track `result_click_position` on the grid and a card-page exit action so we can tell whether the rail moves people onward.

## Step 3 — Internal linking and curated pruning (Phase 3)

- Every guide links to 3-5 concrete search queries; every card page links to its ontology role searches; `/browse-searches` links back into the relevant guides.
- Review the 90 curated searches: promote the ones with real impressions into indexable pages with unique copy, retire the thin ones instead of adding more.
- Add a share affordance on results, and give the Discord result embed a card thumbnail plus a top-3 preview.

## Step 4 — Self-heal regression guard (Phase 4)

A scheduled check that the self-heal loop still converges and does not re-process the same issue after the dedupe work, surfaced in the operations inbox.

## Technical notes

- The rail reuses `card_ontology` and `card_cooccurrence`; no new pipelines or tables.
- New click telemetry goes through the existing `useAnalytics` batch path and must be added to `ALLOWED_EVENT_TYPES`.
- All new strings go through i18n keys across the 11 locales.
- Verification per step: focused tests, `npm run test`, and a live read of the funnel before calling a step done.
