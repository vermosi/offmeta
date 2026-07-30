# Search Experience Audit

## Initial problems found

- The homepage copy was too broad and leaned on discovery language that was not clearly grounded in current behavior.
- The first screen had too many competing actions for a first-time visitor.
- Homepage example queries were useful but not tightly curated around the strongest supported searches.
- Post-search next-step panels overlapped and repeated similar follow-up suggestions.
- The product story was spread across several sections instead of being shown in one clear path.

## Why it mattered

- First-time visitors could miss what OffMeta actually does.
- The search box was not the only obvious action on load.
- The comparison to Scryfall was weaker than it needed to be.
- Users could reach results and still not know what to do next.

## Changes implemented

- Rewrote the hero copy to focus on plain-English search, not generic discovery claims.
- Removed extra hero links so the search action stays primary.
- Curated example queries around supported, concrete search intents.
- Tightened the Scryfall comparison copy and examples.
- Reduced competing next-step actions after results.

## Analytics events touched

- `example_query_impression`
- `example_query_click`
- `homepage_view`
- `search_recovery_clicked`
- `next_steps_related_clicked`
- `share_clicked`

## Accessibility improvements

- Kept example queries as native buttons.
- Preserved keyboard focus behavior on the search entry point.
- Kept the hero and comparison content semantic and heading-based.
- Kept the search hint short so screen-reader and mobile users do not get a wall of text.

## Remaining issues

- The result page still has a lot of helper surfaces, even after trimming one overlapping action layer.
- Locale packs other than English still contain the older phrasing in some places.
- The search journey could still benefit from a more explicit “interpreting your request” state on the main results screen.

## Next five improvements

1. Update the remaining locale strings so the new homepage phrasing is consistent.
2. Make the interpreted-query state more prominent while cards are loading.
3. Consolidate result-side helper panels further if usage data shows overlap.
4. Add/extend tests for empty-state refinement and share flow.
5. Review mobile spacing on the homepage and results bar after this copy pass.
