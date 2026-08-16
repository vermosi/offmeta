/**
 * Terminal search-outcome telemetry.
 *
 * `search_started` tells us a query was submitted; nothing today tells us how
 * that search *ended*. This module guarantees exactly one `search_outcome`
 * event per started search, with a named reason and elapsed time, so the gap
 * between starts and rendered results becomes a measurable number instead of
 * an inference.
 *
 * Lifecycle:
 *   beginSearchOutcome(requestId, query)
 *     -> markSearchDegradation('translate_timeout' | ...)   (optional, 0..n)
 *     -> reportSearchOutcome('results' | 'zero_results' | ...)  (exactly once)
 *
 * If a new search begins while one is still open, the open one is closed as
 * `superseded`. If the page is hidden or unloaded with an open search, it is
 * closed as `navigated_away`.
 */

import { trackEventDirect } from '@/hooks/useAnalytics';
import { supabase } from '@/integrations/supabase/client';

/**
 * Backfill `translation_logs.result_count` for the request that just finished.
 *
 * The edge function only knows the result count on the AI path; deterministic,
 * pattern, concept and cache translations returned before any Scryfall probe.
 * Reporting the count the user actually saw makes zero-result monitoring cover
 * every source instead of the ~4% that go through the AI.
 */
function reportResultCount(requestId: string, resultCount: number): void {
  if (!Number.isFinite(resultCount) || resultCount < 0) return;
  void supabase
    .rpc('record_translation_result_count', {
      p_request_id: requestId,
      p_result_count: Math.round(resultCount),
    })
    .then(undefined, () => {
      /* Telemetry only — never surface a failure to the user. */
    });
}

export type SearchOutcome =
  | 'results'
  | 'zero_results'
  | 'translate_timeout'
  | 'translate_error'
  | 'rate_limited'
  | 'scryfall_error'
  | 'superseded'
  | 'navigated_away';

export type SearchDegradation =
  | 'translate_timeout'
  | 'translate_error'
  | 'rate_limited';

interface OpenSearch {
  requestId: string;
  query: string;
  startedAt: number;
  degradation: SearchDegradation | null;
}

let openSearch: OpenSearch | null = null;
let listenersAttached = false;

function elapsedMs(search: OpenSearch): number {
  return Math.max(0, Math.round(Date.now() - search.startedAt));
}

function emit(
  search: OpenSearch,
  outcome: SearchOutcome,
  extra: Record<string, string | number | boolean | null> = {},
): void {
  void trackEventDirect('search_outcome', {
    query: search.query.slice(0, 200),
    request_id: search.requestId,
    outcome,
    degraded_reason: search.degradation ?? null,
    elapsed_ms: elapsedMs(search),
    ...extra,
  });
}

function attachListeners(): void {
  if (listenersAttached || typeof window === 'undefined') return;
  listenersAttached = true;

  const closeOnExit = () => {
    if (!openSearch) return;
    emit(openSearch, 'navigated_away');
    openSearch = null;
  };

  window.addEventListener('pagehide', closeOnExit);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') closeOnExit();
  });
}

export function beginSearchOutcome(requestId: string, query: string): void {
  attachListeners();
  if (openSearch && openSearch.requestId !== requestId) {
    emit(openSearch, 'superseded');
  }
  openSearch = {
    requestId,
    query,
    startedAt: Date.now(),
    degradation: null,
  };
}

export function markSearchDegradation(reason: SearchDegradation): void {
  if (!openSearch) return;
  openSearch.degradation = reason;
}

/**
 * Close the open search. No-op when nothing is open (so duplicate result
 * effects can call this freely) or when the id no longer matches.
 */
export function reportSearchOutcome(
  outcome: SearchOutcome,
  options?: { requestId?: string | null; resultsCount?: number },
): void {
  if (!openSearch) return;
  if (options?.requestId && options.requestId !== openSearch.requestId) return;
  emit(openSearch, outcome, {
    results_count:
      typeof options?.resultsCount === 'number' ? options.resultsCount : null,
  });
  if (
    typeof options?.resultsCount === 'number' &&
    (outcome === 'results' || outcome === 'zero_results')
  ) {
    reportResultCount(openSearch.requestId, options.resultsCount);
  }
  openSearch = null;
}

/** Test helper — drops any open search without emitting. */
export function resetSearchOutcomeForTests(): void {
  openSearch = null;
}

export function hasOpenSearchOutcome(): boolean {
  return openSearch !== null;
}
