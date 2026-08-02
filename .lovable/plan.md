# Plan: Friendly error states with retry button for pagination failures

## Goal
When loading additional card results fails (infinite-scroll pagination), show a friendly inline error state with a clear retry button so users can recover without reloading the page.

## Current state

- Search pagination is driven by `useInfiniteQuery` in `src/hooks/useSearch.ts`.
- `src/components/LoadMoreIndicator.tsx` only renders a loading spinner and end-of-results message; it has no error path.
- `src/components/SearchResultsArea.tsx` passes `fetchNextPage` down to the indicator and `VirtualizedCardGrid`.
- `VirtualizedCardGrid` has its own `onLoadMore` callback and rendering path; it also lacks an error state.
- The hook does not expose `error` or `isError` from `useInfiniteQuery`, so the UI has no failure signal.

## Implementation

### 1. Expose pagination error from `useSearch.ts`

- Destructure `error`, `isError`, `refetch`, and `isFetchNextPageError` (or equivalent) from `useInfiniteQuery`.
- Add a `retryNextPage` callback that calls `fetchNextPage()` if `hasNextPage` is true, otherwise `refetch()`.
- Track retry attempts with an analytics event (`pagination_retry_clicked`).
- Return the new error/retry values from the hook.

### 2. Update `LoadMoreIndicator.tsx`

- Add props: `error: Error | null`, `onRetry: () => void`, `hasNextPage: boolean`.
- When `error` is present and not currently fetching, render an inline error card:
  - A short, friendly message: "We couldn't load more cards. This is usually a temporary Scryfall connection issue."
  - A primary retry button with a refresh icon and label "Try again".
  - A subdued "End of results" alternative when `hasNextPage` is false.
- Keep the existing loading spinner and end-of-results states unchanged.
- Ensure the element is keyboard accessible and announces via `aria-live`.

### 3. Update `SearchResultsArea.tsx`

- Pull `error` and `onRetry` from `useSearch` (or receive as props) and pass them to `LoadMoreIndicator`.
- For the non-virtualized grid path, `LoadMoreIndicator` receives the props directly.
- For `VirtualizedCardGrid`, pass the same error/retry props so the grid can render its own inline retry row at the bottom.

### 4. Update `VirtualizedCardGrid.tsx`

- Accept `error`, `onRetry`, and `hasNextPage` props.
- In the bottom loader row (used by the virtualized list), replace the plain spinner with a switch over:
  - fetching next page → spinner
  - error → inline error message + retry button
  - no more pages → end message (optional, if not already handled)
- Ensure the retry row is at least as tall as the spinner row so the virtualizer doesn't collapse.

### 5. Add i18n strings

Add keys to the translation files:

- `results.loadMoreErrorTitle`
- `results.loadMoreErrorDescription`
- `results.retryButton`
- `results.loadingMore`
- `results.endMessage`

If no Japanese/other translations exist, use English fallback via the existing `useTranslation` default-value pattern.

### 6. Analytics

- Track `pagination_error_shown` when the error state first renders.
- Track `pagination_retry_clicked` when the retry button is clicked.
- Include the original query and current page count when available.

### 7. Verification

- Run `npm run lint` and `npx tsc --noEmit`.
- Verify with a Playwright or manual test that intercepting the next Scryfall page request with a 500 error displays the retry button, and clicking it re-fetches the same page.
- Confirm the error state does not appear when there are no more pages (`hasNextPage === false`).

## Out of scope

- No changes to the initial search error handling (that is the existing zero-results / fallback recovery path).
- No changes to the search translation pipeline.
- No new backend endpoints.
