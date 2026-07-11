/**
 * Session heartbeat instrumentation.
 *
 * Measures *engaged* time (not wall-clock) so session duration and bounce
 * metrics reflect real attention:
 *  - Only counts time while the tab is visible AND the user has interacted
 *    within the idle window (default 30s).
 *  - Emits `engaged_session_ping` every PING_INTERVAL_MS of engaged time
 *    (heartbeats let us reconstruct sessions even when the tab is closed
 *    abruptly and `session_end` fails to deliver).
 *  - Emits `session_end` on pagehide with total engaged/wall/route stats,
 *    using `fetch(..., { keepalive: true })` so the request survives unload.
 *
 * Bot + internal-preview filtering mirrors useAnalytics.trackEventDirect so
 * heartbeats don't pollute production dashboards.
 */

import { trackEventDirect } from '@/hooks/useAnalytics';
import { classifyTraffic } from '@/lib/analytics/traffic';
import { env } from '@/lib/core/env';

const PING_INTERVAL_MS = 15_000; // send an engaged ping every 15s of active time
const TICK_MS = 1_000; // accrue engaged time in 1s steps
const IDLE_THRESHOLD_MS = 30_000; // no interaction for 30s -> idle

const INTERACTION_EVENTS = [
  'pointerdown',
  'keydown',
  'wheel',
  'touchstart',
  'scroll',
] as const;

let started = false;

function shouldSuppress(): boolean {
  return classifyTraffic().shouldSuppressInsert;
}

function getSessionId(): string | null {
  try {
    return sessionStorage.getItem('offmeta_session_id');
  } catch {
    return null;
  }
}

function sendKeepaliveEvent(
  eventType: 'session_end',
  payload: Record<string, number | string | boolean>,
): void {
  try {
    const url = env.VITE_SUPABASE_URL;
    const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const body = JSON.stringify({
      event_type: eventType,
      event_data: payload,
      session_id: getSessionId(),
    });

    // fetch keepalive is the only reliable transport during pagehide.
    void fetch(`${url}/rest/v1/analytics_events`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'return=minimal',
      },
      body,
    }).catch(() => {});
  } catch {
    /* best-effort */
  }
}

export function startSessionHeartbeat(): () => void {
  if (started || typeof window === 'undefined') return () => {};
  if (shouldSuppress()) return () => {};
  started = true;

  const startedAt = Date.now();
  let engagedMs = 0;
  let msSinceLastPing = 0;
  let pingsSent = 0;
  let routeChanges = 0;
  let lastInteractionAt = Date.now();
  let visible = document.visibilityState === 'visible';

  const markInteraction = () => {
    lastInteractionAt = Date.now();
  };

  const onVisibility = () => {
    visible = document.visibilityState === 'visible';
    if (visible) lastInteractionAt = Date.now();
  };

  const onNavigation = () => {
    routeChanges += 1;
    lastInteractionAt = Date.now();
  };

  const tick = () => {
    if (!visible) return;
    const idle = Date.now() - lastInteractionAt > IDLE_THRESHOLD_MS;
    if (idle) return;

    engagedMs += TICK_MS;
    msSinceLastPing += TICK_MS;

    if (msSinceLastPing >= PING_INTERVAL_MS) {
      msSinceLastPing = 0;
      pingsSent += 1;
      void trackEventDirect('engaged_session_ping', {
        engaged_ms: engagedMs,
        wall_ms: Date.now() - startedAt,
        route_changes: routeChanges,
        ping_index: pingsSent,
      });
    }
  };

  const flushEnd = () => {
    sendKeepaliveEvent('session_end', {
      engaged_ms: engagedMs,
      wall_ms: Date.now() - startedAt,
      route_changes: routeChanges,
      pings_sent: pingsSent,
    });
  };

  const intervalId = window.setInterval(tick, TICK_MS);
  const opts: AddEventListenerOptions = { passive: true, capture: true };
  for (const evt of INTERACTION_EVENTS) {
    window.addEventListener(evt, markInteraction, opts);
  }
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('popstate', onNavigation);
  window.addEventListener('pagehide', flushEnd);

  return () => {
    window.clearInterval(intervalId);
    for (const evt of INTERACTION_EVENTS) {
      window.removeEventListener(evt, markInteraction, opts);
    }
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('popstate', onNavigation);
    window.removeEventListener('pagehide', flushEnd);
    started = false;
  };
}
