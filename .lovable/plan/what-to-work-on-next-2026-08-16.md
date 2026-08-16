# What to work on next

Based on the last 7 days of live data (5,095 analytics events, 6 registered users, 3 error events, 156k ontology rows), the product works — almost nobody is seeing it, and the people who do search don't click through.

## What the data says

- Funnel: 138 `search_started` → 89 `search_results` → 88 `search_success` → only **30 `card_click`**. Search quality is fine; the results-to-card step is where users stop.
- Reach: 80 homepage views and 90 landing page views in a week. Acquisition, not features, is the ceiling.
- Health: 4 unresolved signals — dynamic-import module load failures (3), a critical SEO regression logged on `/cards/no-mercy`, and one on `/sitemap.xml`.
- `query_cache` holds only 25 rows, so almost every search pays the full AI translation cost.

## Proposed order

### 1. Fix the live health signals (small, do first)
- Chase the "error loading dynamically imported module" events — confirm whether the existing auto-recovery reload is firing or users are hitting a white screen.
- Investigate the two logged critical SEO regressions (`/cards/no-mercy`, `/sitemap.xml`) and confirm whether they are real or false positives from the checker.

### 2. Close the results → card-click gap (highest product leverage)
Only ~34% of successful searches produce a card click. Work the results surface:
- Instrument *why*: log result-position clicks and scroll depth so we know if it's relevance, tile density, or the tile lacking a reason to click.
- Make the first row earn the click: surface "why it matches" more prominently on the tile itself rather than after opening the card.
- Add a lightweight hover/tap preview so scanning is cheap.

### 3. Grow reach (biggest ceiling)
- Verify indexing status of the ~32k card pages and the AI/curated search pages actually submitted vs. indexed; fix whatever is stalling.
- Push the Discord bot (37 searches last week from a channel with near-zero promotion) — it is the cheapest distribution channel already built.
- Ship 2–3 high-intent guide/landing pages against real queries pulled from `search_intent_clusters`.

### 4. Cache warm-up follow-through
`query_cache` at 25 entries means the circuit breaker/pacing work is protecting rate limits but not actually filling the cache. Audit a real warmup run end to end and confirm entries land and are read on the hot path.

## Technical notes

- Funnel numbers come from `public.analytics_events` (`event_type` counts, 7-day window).
- Health signals from `public.error_events`; watchdog has run 77 times in 3 days, so the ops loop itself is alive.
- No schema changes are needed for items 1, 2, or 4; item 2 adds new analytics event types only.

Tell me which track to start with, or approve and I'll take them in the order above.
