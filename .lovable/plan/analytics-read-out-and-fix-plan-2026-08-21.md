# Analytics read-out and fix plan

## What the data says (last 7 days, verified)

Native analytics + the `analytics_events` table:

- 1,081 visitors / 1,337 pageviews. 85% bounce, 1.24 pages per visit, 62s average session.
- Traffic is a Facebook/Instagram burst: m.facebook.com + facebook.com + instagram.com = 670 of ~1,100 referred visits. 914 of 1,108 sessions are mobile. Top country PH (558).
- 1,923 tracked sessions, **115 sessions started a search (6%)**, **20 sessions clicked a card (1%)**.
- Homepage is 1,009 of 1,337 pageviews; almost nothing reaches `/cards/*` or `/guides/*`.
- Impression-to-click on homepage prompts is near zero: 11,157 example-query impressions → 22 clicks (0.2%); 1,179 demo-preview impressions → 16 clicks; 787 nudge impressions → 5 clicks.
- LCP p75 = 3.66s (poor, and this is a mobile-social audience). CLS 0, INP 206ms are fine.
- `retro frame` still logs `search_failure` / `search_no_result_shown` in production.

Note on PostHog: the connector only syncs the public project token (ingest-only). There is no read API available to me, so all numbers above come from native analytics and the events table. PostHog data has to be read in its own dashboard.

## Diagnosis

The problem is not traffic, it's the first screen. A cold mobile visitor from Facebook lands on the homepage, waits ~3.7s for LCP, sees a hero plus three competing prompt surfaces (example carousel, demo preview, sticky nudge) that are almost never clicked, and leaves without searching. 94% of sessions never run the core action.

## Proposed work, in priority order

### 1. Make the first screen one action (biggest lever)
- On mobile, above the fold: headline, search input, and 3-4 tappable example queries. Nothing else.
- Cut the competing surfaces on mobile: keep one prompt set instead of carousel + demo preview + sticky nudge. Retire the two lowest-performing ones rather than restyling them.
- Rewrite the example chips as the queries people actually type here (budget board wipes under $5, cards like Rhystic Study under $5, cards that protect my commander) instead of generic samples.

### 2. Fix mobile LCP (3.66s p75)
- Audit what the homepage LCP element actually is on a throttled mobile profile, then preload/inline it and defer everything below the fold.
- Ensure the hero renders from static shell markup with no lazy chunk in the critical path.

### 3. Reduce impression noise in telemetry
- Example-query impressions (11k) drown every other signal. Fire one impression per session per surface, not per render/scroll.

### 4. Fix `retro frame` in production
- It still returns zero results despite the frame parser. Verify the deployed edge function actually applies `is:retro`, and add a regression test on the live path.

### 5. Post-search continuation
- 115 searches produced 20 card clicks. Once results render, make the first card row unmistakably tappable on mobile and check result-card tap targets against the 36px minimum.

## Technical notes

- Homepage surfaces: `src/components/HeroSection.tsx`, `ExampleQueriesCarousel`, `InstantDemoPreview`, `StickySearchNudge`, all mounted from `src/pages/SearchExperience.tsx`.
- Impression dedupe belongs in the tracking hooks that emit `example_query_impression` / `demo_preview_impression` / `nudge_impression`.
- Frame parsing lives in `supabase/functions/semantic-search/deterministic/parse-patterns.ts`.
- Measurement: re-check search-start rate per session and LCP p75 from `analytics_events` a week after shipping.

## Scope check

This plan changes homepage composition and copy, homepage performance, telemetry sampling, and one search bug. It does not add new pages or features.
