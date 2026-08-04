/**
 * Third-party analytics provider initialization (Google Analytics 4 + PostHog).
 *
 * All providers are optional and best-effort: if a key is missing or init fails,
 * the app continues to use the native Supabase analytics_events pipeline.
 */

import { classifyTraffic } from './traffic';
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
      loaded: () => {
        posthogInitialized = true;
      },
    });
    posthogInstance = posthog;
  } catch {
    // PostHog is best-effort
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

  try {
    if (posthogInitialized && posthogInstance) {
      posthogInstance.capture(name, properties);
    }
  } catch {
    /* best-effort */
  }
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

  try {
    if (posthogInitialized && posthogInstance) {
      posthogInstance.capture('$pageview', { $pathname: path });
    }
  } catch {
    /* best-effort */
  }
}

export function identifyExternalUser(userId: string): void {
  if (typeof window === 'undefined' || !userId) return;

  try {
    if (posthogInitialized && posthogInstance) {
      posthogInstance.identify(userId);
    }
  } catch {
    /* best-effort */
  }
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
