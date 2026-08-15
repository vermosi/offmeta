# Low-Bandwidth Growth Engine

## What already exists (reuse, don't rebuild)

- **Analytics**: `analytics_events` table + `useAnalytics` hook (session id, bot filtering, rate limiting, UTM capture) and `src/lib/analytics/context.ts` (session + first-touch attribution, PostHog super properties). Funnel events already exist in `src/lib/analytics/funnels.ts`.
- **Events already tracked**: `search_started`, `search_success`, `search_failure`, `card_click`, `share_clicked`, `first_return_visit`, `route_view`.
- **Sharing**: `CopyLinkButton` (in the results toolbar), `SharePageButton`, `ShareSearchButton`.
- **Search URLs**: `/?q=...` and a `/search/:slug` route, both rendering `SearchExperience`; filters already encode into the URL.
- **SEO**: `SeoManager` sets per-search title/description/canonical/OG; curated searches + sitemap already handle the indexable set.
- **Admin**: `admin-rpc` edge function with `admin_api.*` server-side aggregation and a `ConversionFunnelPanel` that already breaks traffic down by UTM source.

So this is mostly an **extension** job: add `ref` as a first-class attribution dimension, sharpen the share affordance, add one admin view, and add a `/creators` page.

## P0 — Referral attribution

- Add `ref` (plus `via`) to the attribution keys in `src/lib/analytics/context.ts`, sanitized and normalized (lowercase, alphanumeric + dashes, max 32 chars).
- Persist like UTMs: session-scoped value wins for the visit, first-touch value stored in localStorage for lifetime attribution.
- Attach `ref` / `initial_ref` to every Supabase `analytics_events` row and every PostHog event via the existing super-property path. No new tracking stack, no account needed, no personal data.
- Emit a once-per-session `referral_visit` event, and add `second_search` (fired when a session's second successful search completes) to the allow-list. The remaining requested events already exist under current names (`search_started`, `search_success`, `share_clicked`, `card_click`, `first_return_visit`).

## P0 — Referral analytics in admin

- New `admin_api.get_referral_acquisition(days_back)` SQL function + public admin-guarded wrapper, following the existing `get_conversion_funnel` pattern (migration included).
- Per source: visitors (distinct sessions), searches, searches/visitor, second-search rate, shares, return visitors.
- Surface as an "Acquisition" table inside the existing analytics area (new panel next to `ConversionFunnelPanel`), sorted by engaged users, not raw visits.

## P0 — Shareable search URLs + share action

- Keep the current `?q=` URL as the canonical shareable link (it already restores query, filters, and view mode).
- When a visit arrives with a `q` param and an external referrer, show a quiet one-line context strip above the results: what was searched, plus a clear "Search something else" affordance that focuses the search bar. Styled with the existing editorial tokens — not a marketing banner.
- Upgrade the toolbar's copy-link control into a small share control: native `navigator.share` when available, clipboard copy otherwise, same visual weight as today. Emits `share_clicked` with `surface` and `ref`.

## P1 — Share card image

- `src/lib/share/shareCard.ts` renders a share image client-side on `<canvas>`: the plain-English question, up to 3 result card arts, and a small `offmeta.app` wordmark. No gradients, no logo wall.
- Used by the share control (`files` share when supported, otherwise download). Server-side dynamic OG image generation is deferred — the client version needs no infrastructure and the module boundary keeps a future edge function drop-in.

## P1 — /creators page

Single lean route reusing the existing editorial landing primitives:
- Two-paragraph explanation of what OffMeta does.
- 10 demo-worthy searches as clickable links (each one a real search URL).
- A small input that turns a name into `https://offmeta.app/?ref=name` with a copy button. No accounts, no dashboard, no rewards.
- One short note on the built-in share action.
Route is indexable; linked from the footer only.

## P2 — Discord / content tooling (documented, minimal build)

- The existing `offmeta-api` edge function already exposes search without frontend assumptions, so a Discord bot needs no new backend. I'll document the smallest bot implementation (slash command → `offmeta-api` → embed + result link) in `docs/` rather than shipping a bot.
- Interesting-search admin tooling is deferred; the referral/acquisition panel lands first and the curated-searches admin already lists high-value queries.

## SEO decision

No change to indexing behaviour: user-generated `?q=` searches stay non-indexable through the existing canonical strategy, curated searches remain the indexable surface, and `/creators` is a single new indexable page. `ref` params never enter canonical URLs.

## Technical notes

- Migration: one new `admin_api` function + admin-guarded public wrapper with explicit GRANTs.
- Tests: attribution parsing/persistence for `ref`, share-URL construction, share-card text layout helpers, referral analytics panel rendering.
- Verification: lint, typecheck, unit tests, and bundle-size check after implementation.
