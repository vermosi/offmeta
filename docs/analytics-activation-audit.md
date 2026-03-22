# Analytics Activation Audit

## Current implementation findings

| Area                          | Current state                                                              | Evidence                                                                                                                                    | Status              |
| ----------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Homepage pageview tracking    | Dedicated landing-page view tracking is now available on the homepage.     | `Index.tsx` fires `landing_page_view` for first-load home visits through `useAnalytics`.                                                    | Present             |
| SPA route-change tracking     | Basic route-view tracking is now available.                                | `Index.tsx` fires `route_view` when the current route changes.                                                                              | Present             |
| Internal traffic filtering    | No founder/dev exclusion logic found in the client hook.                   | Current payloads add session ID, UTM values, and per-session search count only.                                                             | Missing             |
| Session duration logic        | No timed engagement, heartbeat, or session-end duration calculation found. | The current implementation logs discrete interaction events only.                                                                           | Not trustworthy yet |
| First-search submit tracking  | Present.                                                                   | `handleSearch` emits a `search` event when the translator returns a result.                                                                 | Present             |
| First-search success tracking | Partially present.                                                         | `search_results` fires when results load and `search_failure` fires on zero results, but there is no explicit `first_search_success` event. | Partial             |
| Result interaction tracking   | Present.                                                                   | Card clicks, modal views, affiliate clicks, and pagination are tracked.                                                                     | Present             |
| Example-query usage tracking  | Impression and click tracking are now available for homepage chips.        | `UnifiedSearchBar.tsx` logs example-chip impressions and clicks, but search-success and result-click attribution are still missing.         | Present             |

## Code evidence reviewed

- `src/hooks/useAnalytics.ts`
- `src/hooks/useSearch.ts`
- `src/components/CardItem.tsx`
- `src/components/CardModal.tsx`
- `src/components/ReportIssueDialog.tsx`
- `src/components/SearchFeedback.tsx`

## Confirmed answers for the original audit questions

### Is average session duration trustworthy?

Still no. The current codebase does not implement heartbeat events, route dwell timing, or session-end duration logic, so average session duration should still be treated as **not trustworthy** until timing instrumentation is added.

### Is founder/dev traffic excluded?

No evidence of exclusion was found in the current analytics implementation. Founder/dev traffic should be treated as **not excluded** until explicit filtering rules are added.

### Can first-search and result interaction be measured cleanly?

Yes for the core path, but not fully for all activation questions.

- **Clean today:** landing-page view, route view, search submit, example-chip impression/click, result count, zero-result failures, card clicks, modal views, affiliate clicks, pagination.
- **Not clean today:** explicit first-search start, explicit first-search success across all entry points, first refinement, return visits, session engagement quality.

## Current source-of-truth event inventory

### Implemented now

1. `search`
2. `search_results`
3. `search_failure`
4. `rerun_edited_query`
5. `card_click`
6. `card_modal_view`
7. `affiliate_click`
8. `pagination`
9. `feedback_submitted`
10. `landing_page_view`
11. `route_view`
12. `example_query_impression`
13. `example_query_click`

### Recommended activation funnel spec

1. `landing_page_view`
2. `first_search_start`
3. `first_search_submit`
4. `first_search_success`
5. `first_result_click`
6. `first_refinement`
7. `first_return_visit`

## Event/schema gaps to add next

- `first_search_start`
- `first_search_success`
- `first_refinement`
- `first_return_visit`
- `example_query_search_success`
- `example_query_result_click`
- `engaged_session_ping`
- `session_end`

## Internal traffic exclusion rules to implement

- Exclude known founder/dev user IDs where available.
- Exclude localhost and non-production preview hostnames from production reporting.
- Support downstream IP-based exclusion where policy and tooling allow it.
- Add an explicit `traffic_type` or `is_internal` marker for QA/staging sessions.

## Recommended next steps

1. Add `landing_page_view` and `route_view` instrumentation.
2. Add example-chip impression/click attribution.
3. Split `search` into start/submit/success semantics for activation reporting.
4. Add session engagement timing before trusting session duration or bounce metrics.
5. Add internal-traffic filtering before using topline engagement numbers for decisions.
