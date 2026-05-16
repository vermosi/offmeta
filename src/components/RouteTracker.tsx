/**
 * RouteTracker — global SPA navigation tracker.
 *
 * Mounted once inside <BrowserRouter> in App.tsx. Fires a `route_view`
 * analytics event on every route change, with click-path context:
 *  - from_path: the previous path (so consecutive events form a path)
 *  - nav_index: ordinal of this navigation within the session
 *  - dwell_ms: time spent on the previous route before navigating
 *
 * This lets us reconstruct user click paths across the whole site
 * without per-page wiring.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAnalytics } from '@/hooks/useAnalytics';

export function RouteTracker() {
  const location = useLocation();
  const { trackRouteView } = useAnalytics();
  const lastKeyRef = useRef<string | null>(null);
  const lastPathRef = useRef<string | null>(null);
  const lastEnteredAtRef = useRef<number>(Date.now());
  const navIndexRef = useRef<number>(0);

  useEffect(() => {
    const key = `${location.pathname}${location.search}${location.hash}`;
    if (lastKeyRef.current === key) return;

    const now = Date.now();
    const fromPath = lastPathRef.current;
    const dwellMs = fromPath ? now - lastEnteredAtRef.current : undefined;

    navIndexRef.current += 1;

    trackRouteView({
      path: location.pathname,
      search: location.search || undefined,
      referrer: document.referrer || undefined,
      from_path: fromPath || undefined,
      nav_index: navIndexRef.current,
      dwell_ms: dwellMs,
    });

    lastKeyRef.current = key;
    lastPathRef.current = location.pathname;
    lastEnteredAtRef.current = now;
  }, [location.pathname, location.search, location.hash, trackRouteView]);

  return null;
}
