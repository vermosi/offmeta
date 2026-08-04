/**
 * Third-party analytics provider initialization (Google Analytics 4 + PostHog).
 *
 * All providers are optional and best-effort: if a key is missing or init fails,
 * the app continues to use the native Supabase analytics_events pipeline.
 */

import { classifyTraffic } from './traffic';
import {
  allowEvent,
  buildReplayConfig,
  isReplayBlockedPath,
  shouldRecordSession,
} from './replay';
import { posthog, type PostHog } from 'posthog-js';

// ---------------------------------------------------------------------------
// Google Analytics 4
// ---------------------------------------------------------------------------

type GtagCommand = 'js' | 'config' | 'event' | 'set' | 'consent';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (
      command: GtagCommand,
      ...args: (string | number | Date | Record<string, unknown>)[]
    ) => void;
  }
}

let gaInitialized = false;

function initGoogleAnalytics(measurementId: string): void {
  if (gaInitialized || typeof document === 'undefined') return;
  try {
    const existing = document.querySelector(
      `script[src*="googletagmanager.com/gtag/js?id=${measurementId}"]`,
    );
    if (existing) {
      gaInitialized = true;
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer ?? [];
    window.gtag = function gtag(...args) {
      window.dataLayer?.push(args);
    };
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      send_page_view: false, // we manage page views manually for SPA routes
      anonymize_ip: true,
    });
    gaInitialized = true;
  } catch {
    // GA is best-effort
  }
}

// ---------------------------------------------------------------------------
// PostHog
// ---------------------------------------------------------------------------

let posthogInstance: PostHog | null = null;
let posthogInitialized = false;

async function initPostHog(
  projectToken: string,
  region: string,
): Promise<void> {
  if (posthogInitialized || typeof window === 'undefined') return;
  try {
    const apiHost =
      region === 'us' ? 'https://us.i.posthog.com' : 'https://eu.i.posthog.com';
    posthog.init(projectToken, {
      api_host: apiHost,
      autocapture: false, // we use explicit event tracking
      capture_pageview: false, // manual SPA page views
      // Privacy-safe replay: sampled per session, all inputs masked.
      ...buildReplayConfig(),
      loaded: () => {
        posthogInitialized = true;
        flushPostHogQueue();
      },
    });
    posthogInstance = posthog;
  } catch {
    // PostHog is best-effort
  }
}

/**
 * Events fired before PostHog finishes loading are queued instead of dropped,
 * so cold-load funnel steps are not lost.
 */
type QueuedCall =
  | { kind: 'capture'; name: string; properties: Record<string, unknown> }
  | { kind: 'register'; properties: Record<string, unknown> }
  | { kind: 'person'; properties: Record<string, unknown> }
  | { kind: 'identify'; userId: string };

const MAX_QUEUED_CALLS = 50;
const posthogQueue: QueuedCall[] = [];

function enqueuePostHog(call: QueuedCall): void {
  if (posthogQueue.length >= MAX_QUEUED_CALLS) return;
  posthogQueue.push(call);
}

function runPostHogCall(call: QueuedCall): void {
  if (!posthogInstance) return;
  switch (call.kind) {
    case 'capture':
      posthogInstance.capture(call.name, call.properties);
      break;
    case 'register':
      posthogInstance.register(call.properties);
      break;
    case 'person':
      posthogInstance.setPersonProperties(call.properties);
      break;
    case 'identify':
      posthogInstance.identify(call.userId);
      break;
  }
}

function flushPostHogQueue(): void {
  while (posthogQueue.length > 0) {
    const call = posthogQueue.shift();
    if (!call) break;
    try {
      runPostHogCall(call);
    } catch {
      /* best-effort */
    }
  }
}

/** Run now when PostHog is ready, otherwise queue until it loads. */
function withPostHog(call: QueuedCall): void {
  if (typeof window === 'undefined') return;
  try {
    if (posthogInitialized && posthogInstance) {
      runPostHogCall(call);
    } else {
      enqueuePostHog(call);
    }
  } catch {
    /* best-effort */
  }
}


/**
 * Stop replay capture when the user navigates onto a sensitive route and
 * resume it when they leave (only if this session was sampled in).
 */
function syncReplayForPath(path: string): void {
  if (!posthogInstance) return;
  try {
    if (isReplayBlockedPath(path)) {
      posthogInstance.stopSessionRecording();
    } else if (shouldRecordSession()) {
      posthogInstance.startSessionRecording();
    }
  } catch {
    /* best-effort */
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface AnalyticsInit {
  googleAnalyticsMeasurementId?: string;
  posthogProjectToken?: string;
  posthogRegion?: string;
}

export function initializeAnalytics(config: AnalyticsInit): void {
  if (typeof window === 'undefined') return;

  const { isInternal, shouldSuppressInsert } = classifyTraffic();
  if (isInternal && shouldSuppressInsert) {
    // Skip third-party analytics in local/preview builds to keep data clean.
    return;
  }

  if (config.googleAnalyticsMeasurementId) {
    initGoogleAnalytics(config.googleAnalyticsMeasurementId);
  }
  if (config.posthogProjectToken) {
    void initPostHog(config.posthogProjectToken, config.posthogRegion ?? 'eu');
  }
}

export function trackExternalEvent(
  name: string,
  properties: Record<string, unknown> = {},
): void {
  if (typeof window === 'undefined') return;

  try {
    if (gaInitialized && window.gtag) {
      window.gtag('event', name, properties);
    }
  } catch {
    /* best-effort */
  }

  // Client-side rate limit: protects the project quota from runaway loops.
  if (!allowEvent()) return;
  withPostHog({ kind: 'capture', name, properties });
}

/** Attach properties to every subsequent PostHog event (super properties). */
export function registerExternalSuperProperties(
  properties: Record<string, unknown>,
): void {
  withPostHog({ kind: 'register', properties });
}

/** Attach properties to the PostHog person profile (cohort breakdowns). */
export function setExternalPersonProperties(
  properties: Record<string, unknown>,
): void {
  withPostHog({ kind: 'person', properties });
}

export function trackExternalPageView(path: string): void {
  if (typeof window === 'undefined') return;

  const measurementId = import.meta.env
    .VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY;

  try {
    if (gaInitialized && window.gtag && measurementId) {
      window.gtag('config', measurementId, { page_path: path });
    }
  } catch {
    /* best-effort */
  }

  // Never record replay on sensitive routes, even mid-session.
  syncReplayForPath(path);

  if (!allowEvent()) return;
  withPostHog({
    kind: 'capture',
    name: '$pageview',
    properties: { $pathname: path },
  });
}

export function identifyExternalUser(userId: string): void {
  if (typeof window === 'undefined' || !userId) return;
  withPostHog({ kind: 'identify', userId });
}


export function resetExternalUser(): void {
  if (typeof window === 'undefined') return;

  try {
    if (posthogInitialized && posthogInstance) {
      posthogInstance.reset();
    }
  } catch {
    /* best-effort */
  }
}
