# Roadmap

This page tracks active product work only. Shipped implementation history belongs in git history and release notes, not in the application guide.

## Near Term

| Item | Priority | Notes |
| --- | --- | --- |
| Improve search/result UX on mobile and desktop. | P1 | Keep query disclosure, filters, card density, and empty-state recovery clear. |
| Improve search trust signals. | P1 | Make provenance, confidence, assumptions, and interpreted syntax easier to scan. |
| Measure and reduce mobile LCP and complex-query latency. | P1 | Use real throttled mobile measurements and the semantic-search benchmark. |
| Continue localization quality work. | P2 | Remove English leakage and keep search terminology consistent across 11 locales. |

## Next

| Item | Priority | Notes |
| --- | --- | --- |
| Expand community-assisted translation improvements. | P2 | Feed reviewed feedback into deterministic rules without bypassing validation. |
| Improve card price history and alerting. | P2 | Keep prices time-stamped and distinguish missing data from zero prices. |
| Improve public profile and deck-sharing flows. | P2 | Preserve privacy and RLS boundaries. |

## Longer Term

| Item | Priority | Notes |
| --- | --- | --- |
| Expand social discovery and collaboration features. | P3 | Add only when the core search and result experience supports the demand. |

## Scope Notes

- Search, guides, card pages, combos, deck recommendations, archetypes, profiles, collections, and admin analytics are current product surfaces.
- The sitemap intentionally prioritizes indexable search, guide, landing, SEO, and prerendered card pages. Non-indexable application surfaces should not be added casually.
- Canonicals are implemented; route-specific hreflang is not currently treated as shipped functionality.
