# OffMeta Product Audit — Iterative Improvement Plan

_Last updated: 2026-07-21_

This audit is being executed alongside implementation. Each iteration ships a small, reviewable change. This document is the single source of truth for what has been shipped, what is queued, and why.

## 1. What OffMeta is today

- **Product core**: natural-language MTG card search. Type plain English, get real Scryfall results.
- **Positioning gap**: current copy leans "translator" ("turns intent into a real Scryfall search"). Brief calls for "AI-powered discovery engine" — same tech, stronger promise.
- **Architecture**:
  - Client-side pipeline in `src/lib/search/` — deterministic rules → concept mapping → AI translation → Scryfall.
  - Fuzzy card-name recovery, complexity simplification, zero-result fallback, session cache, pre-translation warm-up.
  - Edge fn `semantic-search` for AI translation; Lovable AI Gateway (Gemini) as the model.
  - Analytics: `useAnalytics` covers example clicks, impressions, search, funnel, heartbeat.

## 2. Current routes (audit)

| Route              | Component                | Status                                                                 |
|--------------------|--------------------------|------------------------------------------------------------------------|
| `/`                | `Index` → `SearchExperience` | Core. Homepage clarity is the top priority.                        |
| `/cards/:slug`     | `CardPage`               | Prerendered for top ~5k cards. Post-June-2 recovery focus.             |
| `/guides`, `/guides/:slug` | `GuidesIndex`, `GuidePage` | Long-tail SEO. Healthy.                                     |
| `/combos`          | `FindMyCombos`           | Discovery-adjacent. Keep.                                              |
| `/archetypes`, `/archetypes/:slug` | `ArchetypesIndex`, `ArchetypePage` | Discovery lever. Underused from homepage.         |
| `/ai`, `/ai/:slug` | `AiIndex`, `AiPage`      | Programmatic SEO layer. Healthy.                                       |
| `/decks/*`, `/deckbuilder`, `/collection`, `/deck-recommendations`, `/market` | Various | **Tier-3 sunset per memory**; noindexed. Don't invest. |
| `/browse-searches`, `/saved-searches` | Discovery + retention | Present, could be surfaced more.                            |
| `/about`, `/docs`, `/syntax` | Static/reference    | Fine.                                                                  |
| `/admin/*`         | Admin dashboards         | Internal.                                                              |

## 3. Top problems (prioritized)

1. **Positioning weak** — hero reads like a Scryfall UI, not a discovery engine.
2. **Example queries too tactical** — "budget board wipes under $5" is fine, but doesn't showcase discovery ("cards similar to Seedborn Muse", "punish treasure decks").
3. **No visible "what to do next" after a search** — no similar-card CTA on result cards from the grid view; the CardPage has it but the results grid does not.
4. **"Why OffMeta vs Scryfall" not explained** — no contrastive value prop on the homepage.
5. **Empty state recovery is good** but "related searches" surface is absent.
6. **Shareable query URLs** — search state is in URL, but no explicit "share" CTA above the results.
7. **First-use guide** — no lightweight dismissible hint teaching what plain English works.
8. **Result-card scanability** — mana cost / type line hierarchy could tighten on mobile.
9. **Analytics** — no explicit "share_click", "similar_card_click_from_grid", "next_step_click" events.
10. **Bundle** — HeroCardBackdrop eagerly loads 6 Scryfall images. Already optimized with lazy for non-center; verify LCP impact.

## 4. Iteration plan (~8 PRs)

- **PR1 (this iteration)**: Repositioning — hero copy, example queries, audit doc. ✅ shipping now.
- **PR2**: Homepage "How is OffMeta different from Scryfall?" contrastive section.
- **PR3**: Results-view "next steps" bar (Share query, Similar to top result, Related searches).
- **PR4**: Result-card quick actions in grid (Similar / Card page / Copy).
- **PR5**: First-use dismissible hint near search bar.
- **PR6**: Analytics — add missing events (share, next-step, related-search).
- **PR7**: Accessibility sweep (focus rings, aria on new controls, contrast on chips).
- **PR8**: Tests + docs update.

## 5. Deliverables per iteration

Each iteration ends with:

- Files changed.
- Tests added or updated.
- Commands run (`npm run test`, `npm run build` where applicable).
- Remaining risks.

## 6. Iteration 1 changes (shipped)

- Reordered `EXAMPLE_QUERIES` in `UnifiedSearchBar.tsx` to lead with discovery-flavored queries from the brief while keeping tested queries present.
- Updated `HeroSection.tsx` headline + subtitle to reposition as an AI-powered MTG discovery engine.
- No test-breaking changes (queries used by tests remain in the list; hero tests, if any, target semantic roles rather than exact copy).

## 7. Non-goals (protected scope)

Per memory + brief: no deck builder expansion, no collection features, no playtester, no social network, no chatbot. Search discovery only.
