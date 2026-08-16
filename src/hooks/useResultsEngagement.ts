/**
 * Tracks how far a visitor actually scrolls through a set of search results.
 *
 * The click-through rate alone cannot tell us whether users ignored the results
 * or never saw them. This hook records the deepest scroll position reached in
 * the results container and flushes a single `results_engagement` event when the
 * query changes or the results unmount.
 *
 * @module hooks/useResultsEngagement
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';

interface UseResultsEngagementOptions {
  /** The user's original natural-language query. */
  query: string;
  /** Number of result cards currently rendered. */
  resultCount: number;
  /** Container wrapping the rendered results. */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Skip tracking (e.g. while loading or on non-results tabs). */
  enabled?: boolean;
}

/** Clamp a ratio into the 0..1 range. */
function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function useResultsEngagement({
  query,
  resultCount,
  containerRef,
  enabled = true,
}: UseResultsEngagementOptions): void {
  const { trackEvent } = useAnalytics();
  const maxDepthRef = useRef(0);
  const startedAtRef = useRef(0);
  const resultCountRef = useRef(resultCount);
  resultCountRef.current = resultCount;

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scrolled = window.innerHeight - rect.top;
    const depth = clamp01(scrolled / Math.max(rect.height, 1));
    if (depth > maxDepthRef.current) maxDepthRef.current = depth;
  }, [containerRef]);

  useEffect(() => {
    if (!enabled || !query) return;

    maxDepthRef.current = 0;
    startedAtRef.current = Date.now();

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    const flush = () => {
      const depth = maxDepthRef.current;
      const count = resultCountRef.current;
      if (count <= 0) return;
      trackEvent('results_engagement', {
        query,
        result_count: count,
        max_scroll_pct: Math.round(depth * 100),
        approx_cards_seen: Math.max(1, Math.round(depth * count)),
        dwell_ms: Date.now() - startedAtRef.current,
      });
    };

    // Flush on tab close/backgrounding too — unmount does not always run.
    const onHidden = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onHidden);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      document.removeEventListener('visibilitychange', onHidden);
      flush();
    };
  }, [enabled, query, measure, trackEvent]);
}
