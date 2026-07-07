/**
 * Companion hook for the search profiler: records when the results grid
 * paints its first card row after a new query is dispatched.
 *
 * The main trace (validation → translation → handoff) is closed inside
 * `useSearchHandler` because the card fetch is owned by React Query and
 * runs after the trace hands off. This hook fills the gap by logging a
 * "first-render" mark keyed to the executed Scryfall query, so devs can
 * see the full picture in DevTools Performance and the console.
 */

import { useEffect, useRef } from 'react';

const STORAGE_KEY = 'offmeta_profile_search';

function isEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const flag = window.localStorage?.getItem(STORAGE_KEY);
    if (flag === '1' || flag === 'true') return true;
  } catch {
    /* ignore */
  }
  return import.meta.env?.DEV ?? false;
}

interface Options {
  scryfallQuery: string | undefined;
  cardCount: number;
  isSearching: boolean;
}

/**
 * Fires once per (scryfallQuery) transition, when the first result batch
 * has rendered. Emits a `performance.mark` and a console log.
 */
export function useSearchRenderProfiler({
  scryfallQuery,
  cardCount,
  isSearching,
}: Options): void {
  const dispatchedAt = useRef<{ query: string; at: number } | null>(null);
  const reportedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isEnabled() || !scryfallQuery) return;
    if (dispatchedAt.current?.query !== scryfallQuery) {
      dispatchedAt.current = { query: scryfallQuery, at: performance.now() };
      reportedFor.current = null;
      try {
        performance.mark?.(`offmeta.search:render-dispatch`);
      } catch { /* ignore */ }
    }
  }, [scryfallQuery]);

  useEffect(() => {
    if (!isEnabled() || !scryfallQuery) return;
    if (isSearching || cardCount === 0) return;
    if (reportedFor.current === scryfallQuery) return;
    const dispatched = dispatchedAt.current;
    if (!dispatched || dispatched.query !== scryfallQuery) return;

    const elapsedMs = performance.now() - dispatched.at;
    reportedFor.current = scryfallQuery;
    try {
      performance.mark?.(`offmeta.search:first-render`);
      performance.measure?.(
        `offmeta.search:dispatch→first-render`,
        `offmeta.search:render-dispatch`,
        `offmeta.search:first-render`,
      );
    } catch { /* ignore */ }
    // eslint-disable-next-line no-console
    console.info(
      `%c[search-profile] first render — ${elapsedMs.toFixed(0)}ms · ${cardCount} cards`,
      'color:#10b981;font-weight:600',
      { scryfallQuery },
    );
  }, [scryfallQuery, cardCount, isSearching]);
}
