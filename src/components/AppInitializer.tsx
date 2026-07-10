/**
 * Deferred app initialization: prefetching, realtime sync, edge function warmup.
 * Lazy-loaded to keep the main entry bundle lean.
 */

import { useEffect, useRef } from 'react';
import { useRealtimeCache } from '@/hooks/useRealtimeCache';
import { usePrefetchPopularQueries } from '@/hooks/useSearchQuery';
import { supabase } from '@/integrations/supabase/client';
import { initWebVitals } from '@/lib/rum/webVitals';
import { startSessionHeartbeat } from '@/lib/analytics/sessionHeartbeat';
import { useTranslation } from '@/lib/i18n';

/**
 * Schedules work for when the browser is idle, falling back to setTimeout.
 * Prevents background prefetch / warmup from competing with the user's
 * first paint and first interaction.
 */
function scheduleIdle(cb: () => void, fallbackDelay = 1500): () => void {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (typeof w.requestIdleCallback === 'function') {
    const id = w.requestIdleCallback(cb, { timeout: 4000 });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(cb, fallbackDelay);
  return () => window.clearTimeout(id);
}

function useEdgeFunctionWarmup() {
  const lastWarmupPath = useRef<string | null>(null);
  const { locale } = useTranslation();

  useEffect(() => {
    const warmEdgeFunction = () => {
      const currentPath = `${window.location.pathname}${window.location.search}`;
      if (lastWarmupPath.current === currentPath) return;
      lastWarmupPath.current = currentPath;

      void supabase.functions
        .invoke('semantic-search', {
          body: { query: 'ping warmup', useCache: true, locale },
        })
        .catch(() => {});
    };

    // Defer warmup until the browser is idle so it never competes with
    // first paint or the user's first interaction.
    const cancel = scheduleIdle(warmEdgeFunction, 2000);

    const onNavigation = () => scheduleIdle(warmEdgeFunction, 500);

    window.addEventListener('popstate', onNavigation);

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      onNavigation();
    };
    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      onNavigation();
    };

    return () => {
      cancel();
      window.removeEventListener('popstate', onNavigation);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [locale]);
}

function useRumInit() {
  useEffect(() => {
    initWebVitals();
    const stopHeartbeat = startSessionHeartbeat();
    return stopHeartbeat;
  }, []);
}

export default function AppInitializer() {
  // Search-first focus: only prefetch the popular search queries that feed
  // the homepage. Deck/market/archetype/signature-card prefetches were
  // removed because those routes are de-prioritized (see mem://product/core-focus).
  usePrefetchPopularQueries();
  useRealtimeCache();
  useEdgeFunctionWarmup();
  useRumInit();
  return null;
}
