/**
 * Privacy-safe session replay sampling + client-side event rate limiting.
 *
 * Goals:
 *  - Record only a small, representative slice of sessions (sampling) so the
 *    PostHog free tier is not overwhelmed by recording volume.
 *  - Never record internal/preview traffic, bots, or sensitive routes.
 *  - Mask all user input and sensitive text so replays never carry PII.
 *  - Rate-limit outbound custom events per session so a runaway loop cannot
 *    burn the project's event quota.
 *
 * The sampling decision is made once per session and persisted in
 * sessionStorage, so a recorded session stays recorded end-to-end (partial
 * replays are useless) and a skipped session is never re-rolled mid-visit.
 */

import type { PostHogConfig } from 'posthog-js';
import { classifyTraffic } from './traffic';

const REPLAY_DECISION_KEY = 'offmeta_replay_sampled';

/**
 * Fraction of eligible sessions that get a session replay.
 * At current traffic (~10 real visitors/day) full capture stays far under the
 * PostHog free-tier recording quota, and partial sampling made replays
 * effectively invisible. Lower this if traffic grows by an order of magnitude.
 */
export const REPLAY_SAMPLE_RATE = 1;

/** How long a tab can be inactive before PostHog starts a new session. */
export const REPLAY_SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes


/** Max custom events sent to PostHog per session (burst + steady state). */
export const EVENT_BUCKET_CAPACITY = 120;

/** Tokens (events) refilled per minute once the burst budget is spent. */
export const EVENT_REFILL_PER_MINUTE = 30;

/**
 * Routes that must never be recorded, even for a sampled session.
 * Auth and admin surfaces can expose credentials or operational data.
 */
const REPLAY_BLOCKED_PATH_PREFIXES = [
  '/auth',
  '/login',
  '/signup',
  '/reset-password',
  '/admin',
  '/account',
  '/settings',
];

export function isReplayBlockedPath(pathname: string): boolean {
  const normalized = pathname.toLowerCase();
  return REPLAY_BLOCKED_PATH_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

function readStoredDecision(): boolean | null {
  try {
    const stored = window.sessionStorage.getItem(REPLAY_DECISION_KEY);
    if (stored === '1') return true;
    if (stored === '0') return false;
  } catch {
    /* sessionStorage unavailable (private mode) */
  }
  return null;
}

function storeDecision(sampled: boolean): void {
  try {
    window.sessionStorage.setItem(REPLAY_DECISION_KEY, sampled ? '1' : '0');
  } catch {
    /* best-effort */
  }
}

/**
 * Decide once per session whether this visit is eligible for replay capture.
 * Internal/preview traffic, bots, blocked routes, and unsampled sessions
 * all return false.
 */
export function shouldRecordSession(
  sampleRate: number = REPLAY_SAMPLE_RATE,
): boolean {
  if (typeof window === 'undefined') return false;

  const { isInternal, shouldSuppressInsert } = classifyTraffic();
  if (isInternal || shouldSuppressInsert) {
    // Internal/preview traffic is excluded for the whole session.
    storeDecision(false);
    return false;
  }

  // Blocked paths are route-level, not session-level. Don't lock the session
  // out of recording forever just because the user landed on /auth first.
  if (isReplayBlockedPath(window.location.pathname)) return false;

  const stored = readStoredDecision();
  if (stored !== null) return stored;

  const sampled = Math.random() < sampleRate;
  storeDecision(sampled);
  return sampled;
}

/**
 * PostHog session-recording config: aggressive masking so replays capture
 * layout and interaction shape, never user-entered content.
 */
export function buildReplayConfig(): Partial<PostHogConfig> {
  const recordingEnabled = shouldRecordSession();

  return {
    disable_session_recording: !recordingEnabled,
    session_idle_timeout_ms: REPLAY_SESSION_IDLE_TIMEOUT_MS,
    session_recording: {
      // Mask every input value, including search boxes and auth fields.
      maskAllInputs: true,
      // Mask any element explicitly flagged as sensitive.
      maskTextSelector: '[data-private], [data-sensitive], input, textarea',
      // Do not record cross-origin iframes (third-party widgets).
      recordCrossOriginIframes: false,
    } as PostHogConfig['session_recording'],
  };
}

// ---------------------------------------------------------------------------
// Client-side event rate limiting (token bucket)
// ---------------------------------------------------------------------------

let tokens = EVENT_BUCKET_CAPACITY;
let lastRefillAt = Date.now();
let droppedEvents = 0;

function refill(now: number): void {
  const elapsedMinutes = (now - lastRefillAt) / 60_000;
  if (elapsedMinutes <= 0) return;
  tokens = Math.min(
    EVENT_BUCKET_CAPACITY,
    tokens + elapsedMinutes * EVENT_REFILL_PER_MINUTE,
  );
  lastRefillAt = now;
}

/**
 * Returns true when the event may be sent. Consumes one token.
 * Page views and funnel steps are low-volume by design; this guards against
 * accidental loops (e.g. an effect firing on every render).
 */
export function allowEvent(now: number = Date.now()): boolean {
  refill(now);
  if (tokens < 1) {
    droppedEvents += 1;
    return false;
  }
  tokens -= 1;
  return true;
}

/** Number of events dropped by the limiter this session (for diagnostics). */
export function getDroppedEventCount(): number {
  return droppedEvents;
}

/** Test helper: restore the limiter to a full bucket. */
export function resetEventLimiter(now: number = Date.now()): void {
  tokens = EVENT_BUCKET_CAPACITY;
  lastRefillAt = now;
  droppedEvents = 0;
}
