
# OffMeta Growth Plan — February 2026

## Traffic Diagnosis

| Metric | Jan 9 (peak) | Last 7 days avg | Trend |
|--------|-------------|-----------------|-------|
| Daily visitors | 1,272 | ~8 | 📉 99% drop |
| Pageviews/visit | 1.25 | 1.07 | Low engagement |
| Bounce rate | ~86% | ~95% | Very high |
| Session duration | 51s (peak day) | ~0s recent | No stickiness |

**Root cause**: One-time traffic spike (likely a Reddit/social post on Jan 9), zero retention mechanics, no content to drive organic search, single-page app with no indexable content beyond the homepage.

---

## Strategy: 3 Pillars

### Pillar 1 — SEO & Content Pages (Organic Discovery)
*Goal: Make OffMeta findable via Google for MTG search queries*

| # | Task | Impact | Effort |
|---|------|--------|--------|
| 1.1 | **Shareable search result pages** — give each search a permalink (e.g. `/search?q=creatures+that+make+treasure`) with proper `<title>`, meta description, and OG tags so searches are indexable and shareable | 🔥 High | Medium |
| 1.2 | **Pre-built "guide" pages** — static routes like `/guides/best-green-ramp`, `/guides/budget-board-wipes`, `/guides/treasure-token-cards` with curated searches, explanations, and internal links | 🔥 High | Medium |
| 1.3 | **Blog / article section** — `/blog` with MTG strategy content (off-meta deck techs, hidden gems, format primers) targeting long-tail keywords | 🔥 High | High |
| 1.4 | **Improve structured data** — add FAQ schema on guide pages, BreadcrumbList, ItemList for search results | Medium | Low |
| 1.5 | **Sitemap expansion** — auto-generate sitemap entries for guide pages and popular searches | Medium | Low |

### Pillar 2 — Retention & Engagement Features
*Goal: Give users reasons to come back*

| # | Task | Impact | Effort |
|---|------|--------|--------|
| 2.1 | **Save searches / favorites** — let users bookmark searches and cards (requires auth) | 🔥 High | Medium |
| 2.2 | **"Daily off-meta pick"** — a featured card/combo on the homepage that changes daily, shareable | 🔥 High | Medium |
| 2.3 | **Search history persistence** — currently session-only; persist across visits | Medium | Low |
| 2.4 | **"Similar searches" suggestions** — after a search, suggest related queries to explore | Medium | Medium |
| 2.5 | **PWA install prompt** — remind mobile users they can install the app | Low | Low |

### Pillar 3 — Social & Distribution
*Goal: Get users to share OffMeta and bring others*

| # | Task | Impact | Effort |
|---|------|--------|--------|
| 3.1 | **Share button on search results** — "Share this search" copies a permalink with OG preview | 🔥 High | Low |
| 3.2 | **OG image generation** — dynamic OG images showing the search query + top card art for social shares | 🔥 High | Medium |
| 3.3 | **Embed widget** — let content creators embed an OffMeta search on their sites | Medium | High |
| 3.4 | **"Powered by OffMeta" watermark on shared images** — brand awareness on social | Low | Low |

---

## Recommended Execution Order (next 5 sprints)

### Sprint 1 — Quick wins for shareability ✅ DONE
- [1.1] ✅ Dynamic document title for search queries (SEO + bookmarks)
- [3.1] ✅ Share button on results (Web Share API + clipboard fallback)
- [2.3] ✅ Persistent search history (already existed in localStorage)

### Sprint 2 — Content for SEO
- [1.2] 5–10 pre-built guide pages targeting high-volume MTG keywords
- [1.4] Structured data on guide pages
- [1.5] Expanded sitemap

### Sprint 3 — Retention hooks
- [2.2] Daily off-meta pick feature
- [2.4] Similar search suggestions
- [2.1] Save searches (add auth)

### Sprint 4 — Social amplification
- [3.2] Dynamic OG images
- [1.3] Blog infrastructure + first 3 articles

### Sprint 5 — Engagement depth
- [3.3] Embed widget
- [2.5] PWA install prompt
- [3.4] Watermark on shares

---

## KPI Targets (90-day)

| Metric | Current | Target |
|--------|---------|--------|
| Daily organic visitors | ~5 | 100+ |
| Bounce rate | ~90% | <65% |
| Pages/visit | 1.1 | 2.0+ |
| Avg session duration | ~0s | 60s+ |
| Returning visitors | ~0% | 20%+ |

---

## Previous Fixes (completed)
- ✅ SEO domain standardization (offmeta.app canonical)
- ✅ useSearch hook extraction
- ✅ All 1,050+ tests passing
