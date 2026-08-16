# What to work on next

Based on the last 7–14 days of live data, three things stand out. All are search-quality first, in priority order.

## 1. Zero-result monitoring is blind on 96% of searches

Verified in `translation_logs` (last 7 days): only the AI paths record a result count. Deterministic (229), pattern_match (185), concept_match (23) and cache (22) rows all store `result_count = NULL`, so the health metrics and zero-result auto-repair loop only ever see the ~71 AI searches.

Fix: report the actual Scryfall result count back for every translation source, not just AI.

- Client sends the observed result count for the pinned `request_id` after results land.
- A small edge endpoint (or an extension of the existing logging path) updates the matching `translation_logs` row.
- Health metrics and the zero-result candidate RPC then cover all sources.

## 2. The AI path still emits queries the deterministic layer already knows how to fix

Every zero-result search in the last 14 days came from the AI path, and most are cases the deterministic modules handle correctly on their own:

- `shirtless cards` -> `o:"shirtless"` (should be `atag:shirtless`)
- `cards with tacos in them` -> `art:taco`
- `banned cards` -> `banned` (invalid syntax on its own)
- `cards like hermit druid` -> `t:druid t:hermit` (a card name treated as types)
- `mono red monkeyape` -> stacked `o:` terms that can never co-occur

Fix: run the existing deterministic post-processors over the AI output before returning it — art-tag/subtype resolution, card-name detection for "cards like X", and a validity check that rejects bare `banned` and multi-`o:` stacks. Falls back to the deterministic interpretation when the AI query is provably empty.

## 3. Result engagement is instrumented but has no data yet

`useResultsEngagement` is wired into `SearchResultsArea`, but no `results_engagement` events exist yet — it only just shipped. Card clicks remain low (30 clicks against 89 result sets in 7 days).

Action: leave the instrumentation to accumulate a week of data, then use scroll-depth and dwell to decide whether the low click rate is a relevance problem or a presentation problem. No code change now.

## Suggested order

1. Result-count reporting for all sources (unblocks measuring everything else).
2. AI-output post-processing against the deterministic layer.
3. Revisit engagement once data exists.

## Technical notes

- Files: `supabase/functions/semantic-search/index.ts` (logging call sites per source), `logging.ts`, `src/hooks/useSearchQuery.ts` (result-count report using the existing `x-request-id`), plus the deterministic modules `artTagMatching.ts`, `subtypeMatching.ts`, `parse-patterns.ts` reused as a post-AI pass in `tag-guard.ts`.
- No schema change needed for item 1; `translation_logs.result_count` and `request_id` already exist and are indexed.
- Tests: extend the semantic-search deterministic tests with the five failing queries above as regression cases.
