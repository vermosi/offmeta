# Accounts that remember you: Saved, Collections, History

Search, card pages, guides, combos and Deck Check stay fully open to signed-out visitors. Signing in adds memory: saved cards and searches, collections to organize them, and a synced search history.

## What the user gets

**Save from anywhere**
- A heart / Save control on every card (grid, list, card page) and a "Save search" action on the search desk.
- Signed out, tapping Save opens a focused sign-in prompt: "Sign in to save cards and access them anywhere." After signing in, the exact card or search they tapped is saved automatically — no repeat click.

**Collections**
- Saving asks where: an existing collection ("Nekusar Upgrades", "Cards to Buy") or a new one created inline.
- A card can live in several collections. Saving without choosing drops it into an "Unsorted" default.
- Collections carry optional format and commander fields now, so a collection can later be promoted into a real deck without rebuilding anything.

**/saved**
- Three tabs: Cards · Searches · Collections.
- Cards tab: filter and sort by collection, color, type, mana value and price. Re-run a saved search with one tap.
- Remove, move between collections, rename and delete collections.

**/history**
- Previous searches with the day they were run, re-run and remove controls, and a clear-all.
- Signed out, history stays local (as today). Signed in, it syncs to the account so desktop research picks up on mobile.

**Account menu**
- My OffMeta · Saved · Collections · Search History · Settings · Sign Out.
- Signed out, the header keeps a single quiet "Sign in" link.

Not in this increment: deck ownership as a first-class object, and natural-language questions over your saves ("which saved cards fit Nekusar"). The data model leaves room for both.

## Technical notes

Database (new tables, all owner-scoped RLS with grants to `authenticated` and `service_role`, none to `anon`):
- `collections` — user_id, name, description, kind ('collection' default, 'deck' reserved), format, commander_name, is_default, timestamps.
- `saved_cards` — user_id, oracle_id, card_name, scryfall_id, image_url, snapshot fields for offline display, note, timestamps; unique on (user_id, oracle_id).
- `saved_card_collections` — join table so one card sits in many collections.
- `saved_searches` — user_id, natural_query, scryfall_query, label, result_count, timestamps; unique on (user_id, normalized query).
- `search_history` — user_id, normalized_query, raw_query, last_run_at, run_count; upsert on re-run, capped per user.

Client:
- `src/hooks/useSavedCards.ts`, `useCollections.ts`, `useSavedSearches.ts` on TanStack Query with optimistic updates, following the existing `useSavedCombos` sync pattern.
- `useSearchHistory` gains a signed-in path that writes to `search_history` and reads the merged list; localStorage remains the signed-out store.
- `SaveCardButton.tsx` (heart + collection picker popover) reused by `CardItem`, `CardListItem` and the card page; `SaveSearchButton.tsx` on the search desk.
- A pending-intent store: when a signed-out user taps Save, the intent is stashed and replayed by `AuthProvider` once a session exists.
- New lazy routes `/saved` and `/history` in `AppRoutes.tsx`, both `noindex`; account links added to `Header.tsx` desktop and mobile menus.
- All new strings go through i18n keys across the 11 locales; styling uses existing editorial primitives and semantic tokens.
- Funnel events for save prompts, sign-in conversions from a save, and collection creation.
