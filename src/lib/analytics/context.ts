/**
 * Audience + attribution context for third-party analytics.
 *
 * The PostHog person export showed every `utm_*` / click-id property empty and
 * no product-side context (locale, PWA mode, entry path, connection quality),
 * because UTMs were only ever written to the Supabase `analytics_events` rows.
 *
 * This module captures that data once per session, registers it as PostHog
 * super properties (so it lands on every event) and stores the first-touch
 * values on the person profile for cohort/attribution breakdowns.
 *
 * All reads are defensive: analytics must never break the app.
 */

import {
  registerExternalSuperProperties,
  setExternalPersonProperties,
} from './providers';
import { classifyTraffic } from './traffic';

const SESSION_KEY = 'offmeta_attribution';
const FIRST_TOUCH_KEY = 'offmeta_attribution_first_touch';

export const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const;

export const CLICK_ID_KEYS = [
  'gclid',
  'gbraid',
  'wbraid',
  'gad_source',
  'fbclid',
  'msclkid',
  'ttclid',
  'twclid',
  'rdt_cid',
  'irclid',
  'igshid',
  'li_fat_id',
  'mc_cid',
] as const;

export type AttributionProperties = Record<string, string>;

function sanitizeValue(value: string): string {
  return value.replace(/[<>"'`]/g, '').trim().slice(0, 200);
}

function safeStorage(kind: 'session' | 'local'): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return kind === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

function readStored(storage: Storage | null, key: string): AttributionProperties | null {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object'
      ? (parsed as AttributionProperties)
      : null;
  } catch {
    return null;
  }
}

function writeStored(
  storage: Storage | null,
  key: string,
  value: AttributionProperties,
): void {
  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    /* private browsing */
  }
}

/** Coarse channel bucket derived from the document referrer. */
export function classifyReferrer(referrer: string, host: string): string {
  if (!referrer) return 'direct';
  let refHost = '';
  try {
    refHost = new URL(referrer).hostname.toLowerCase();
  } catch {
    return 'unknown';
  }
  if (!refHost || refHost === host.toLowerCase()) return 'internal';
  if (/(^|\.)(google|bing|duckduckgo|yahoo|ecosia|brave)\./.test(refHost)) {
    return 'search';
  }
  if (/(^|\.)(reddit|facebook|instagram|x|twitter|t\.co|youtube|tiktok|discord|linkedin|mastodon|bsky)/.test(refHost)) {
    return 'social';
  }
  if (/(^|\.)(chatgpt|openai|perplexity|claude|gemini)\./.test(refHost)) {
    return 'ai_assistant';
  }
  return 'referral';
}

/** UTM + click-id params from the current URL, sanitized. */
export function parseAttributionParams(search: string): AttributionProperties {
  const params = new URLSearchParams(search);
  const result: AttributionProperties = {};
  for (const key of [...UTM_KEYS, ...CLICK_ID_KEYS]) {
    const value = params.get(key);
    if (value) result[key] = sanitizeValue(value);
  }
  return result;
}

function displayMode(): string {
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return 'standalone';
    if (window.matchMedia('(display-mode: minimal-ui)').matches) return 'minimal-ui';
  } catch {
    /* unsupported */
  }
  return 'browser';
}

function mediaMatches(query: string): boolean {
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

function connectionType(): string | undefined {
  const connection = (
    navigator as Navigator & { connection?: { effectiveType?: string } }
  ).connection;
  return connection?.effectiveType;
}

function viewportBucket(width: number): string {
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function readLocale(): string {
  try {
    const stored = window.localStorage.getItem('i18nextLng');
    if (stored) return stored;
  } catch {
    /* private browsing */
  }
  return navigator.language || 'unknown';
}

/** Device / environment context that PostHog cannot infer on its own. */
export function collectEnvironmentContext(): Record<string, string | number | boolean> {
  const width = window.innerWidth || 0;
  const context: Record<string, string | number | boolean> = {
    app_locale: readLocale(),
    app_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
    display_mode: displayMode(),
    is_pwa: displayMode() !== 'browser',
    prefers_reduced_motion: mediaMatches('(prefers-reduced-motion: reduce)'),
    prefers_dark: mediaMatches('(prefers-color-scheme: dark)'),
    viewport_bucket: viewportBucket(width),
    device_pixel_ratio: window.devicePixelRatio || 1,
    is_internal: classifyTraffic().isInternal,
    entry_path: window.location.pathname,
    referrer_category: classifyReferrer(
      document.referrer || '',
      window.location.hostname,
    ),
  };

  const effectiveType = connectionType();
  if (effectiveType) context.connection_type = effectiveType;

  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof memory === 'number') context.device_memory_gb = memory;

  return context;
}

/**
 * Session-scoped attribution (first URL of the session wins), plus the
 * persisted first-touch attribution across visits.
 */
export function resolveAttribution(): {
  session: AttributionProperties;
  firstTouch: AttributionProperties;
} {
  const sessionStore = safeStorage('session');
  const localStore = safeStorage('local');

  const stored = readStored(sessionStore, SESSION_KEY);
  const session = stored ?? parseAttributionParams(window.location.search);
  if (!stored && Object.keys(session).length > 0) {
    writeStored(sessionStore, SESSION_KEY, session);
  }

  let firstTouch = readStored(localStore, FIRST_TOUCH_KEY) ?? {};
  if (Object.keys(firstTouch).length === 0 && Object.keys(session).length > 0) {
    firstTouch = session;
    writeStored(localStore, FIRST_TOUCH_KEY, firstTouch);
  }

  return { session, firstTouch };
}

/**
 * Register attribution + environment context with PostHog/GA.
 * Call once at app start, right after initializeAnalytics().
 */
export function initAudienceContext(): void {
  if (typeof window === 'undefined') return;

  try {
    const { session, firstTouch } = resolveAttribution();
    const environment = collectEnvironmentContext();

    registerExternalSuperProperties({ ...session, ...environment });

    const personProps: Record<string, unknown> = {
      app_locale: environment.app_locale,
      app_timezone: environment.app_timezone,
      referrer_category: environment.referrer_category,
      entry_path: environment.entry_path,
      is_pwa: environment.is_pwa,
    };
    for (const [key, value] of Object.entries(firstTouch)) {
      personProps[`initial_${key}`] = value;
    }

    setExternalPersonProperties(personProps);
  } catch {
    /* analytics is best-effort */
  }
}
