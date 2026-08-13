# Analytics coverage pass for recent features

Page views, search, card views, guides and combo saves are already tracked into the native pipeline, PostHog and GA4 (`RouteTracker` fires `route_view` + a page view to both providers on every route). The gap is action-level tracking for everything built recently: accounts/saved library, collections, saved searches, Deck Check and the combo finder. None of those fire an event today.

## What gets added

**New tracked actions** (native pipeline + PostHog + GA4)
- `account_signed_in` / `account_signed_out`
- `card_saved`, `card_unsaved`
- `collection_created`
- `saved_search_created`, `saved_search_removed`
- `deck_check_run` (with card count and whether it came from a Moxfield import)
- `combo_search_run` (with deck size and combos found)

**New funnel steps and onboarding milestones**
- `card_save` (step 5) and `deck_check` (step 6) added to `FUNNEL_STEPS`, with matching `first_card_save` / `first_deck_check` milestones. This makes the retention story "searched → viewed a card → saved something → came back" measurable per onboarding cohort in PostHog.

**Search Console**
- Already covered by the `submit-sitemap` edge function; no change. Performance data stays in Search Console itself (no ingestion job is being added in this pass).

## Technical detail

- `src/hooks/useAnalytics.ts` — extend `ALLOWED_EVENT_TYPES` with the events above (the allow-list currently rejects unknown types).
- `src/lib/analytics/funnels.ts` — add the two funnel steps and two milestones.
- `src/hooks/useSavedCards.ts` — emit `card_saved` + `trackFunnelStep('card_save')` on save success, `card_unsaved` on removal.
- `src/hooks/useCollections.ts` — emit `collection_created`.
- `src/hooks/useSavedSearches.ts` — emit `saved_search_created` / `saved_search_removed`.
- `src/hooks/useAuth.ts` — emit `account_signed_in` on the `SIGNED_IN` auth event and `account_signed_out` on sign-out, next to the existing `identifyExternalUser` / `resetExternalUser` calls.
- `src/pages/DeckCheck.tsx` — emit `deck_check_run` + funnel step after a successful analysis.
- `src/pages/FindMyCombos.tsx` — emit `combo_search_run` after `handleFindCombos` resolves.

All calls go through the existing best-effort helpers, so a blocked provider or missing key never breaks the UI. No new dependencies, no schema changes.
