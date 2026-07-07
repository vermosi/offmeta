/**
 * Analytics tracking hook for capturing user interactions.
 * Tracks searches, card clicks, modal views, affiliate clicks, and pagination.
 * Includes rate limiting, input validation, and internal traffic filtering.
 */

import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/core/logger';

// ---------------------------------------------------------------------------
// Internal traffic detection
// ---------------------------------------------------------------------------

/**
 * Detect whether the current session is internal (dev/founder).
 * Checks hostname and a manual localStorage flag.
 * Synchronous — no async overhead.
 */
function isInternalTraffic(): boolean {
  const host = window.location.hostname;
  // Localhost / IP
  if (host === 'localhost' || host === '127.0.0.1') return true;
  // Lovable preview domains (NOT the published offmeta.lovable.app)
  if (host.includes('-preview--') && host.endsWith('.lovable.app')) return true;
  // Manual founder flag: localStorage.setItem('offmeta_internal', 'true')
  try {
    if (localStorage.getItem('offmeta_internal') === 'true') return true;
  } catch {
    /* private browsing may throw */
  }
  return false;
}

/** Whether to skip the DB insert entirely (localhost / preview). */
function shouldSuppressInsert(): boolean {
  const host = window.location.hostname;
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    (host.includes('-preview--') && host.endsWith('.lovable.app'))
  );
}

// Rate limiting configuration
const RATE_LIMIT_KEY = 'analytics_events_rate';
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_EVENTS_PER_WINDOW = 60; // 60 events per minute max

// Input validation limits
const MAX_STRING_LENGTH = 500;
const MAX_EVENT_DATA_SIZE = 2000; // bytes
const INSERT_WARN_LATENCY_MS = 250;

// Generate or retrieve a session ID for anonymous tracking
const getSessionId = (): string => {
  const key = 'offmeta_session_id';
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem(key, sessionId);
  }
  return sessionId;
};

// ---------------------------------------------------------------------------
// Bot detection
// ---------------------------------------------------------------------------
//
// Crawler farms running our JS produce telltale session IDs because their
// headless runtime seeds Math.random the same way across instances. A real
// observed signature: many "different" sessions all ending in `yhd4ldlif`.
// We also flag standard headless markers (webdriver, common bot UAs).
//
// Known colliding random suffixes from production analytics. Add new ones
// here as they appear in the data.
const KNOWN_BOT_SUFFIXES = new Set<string>(['yhd4ldlif']);

const BOT_UA_PATTERN =
  /bot|crawl|spider|slurp|headless|phantom|puppeteer|playwright|selenium|webdriver|http-?client|axios|wget|curl|python-requests|node-fetch|scrapy|googlebot|bingbot|gptbot|claudebot|perplexitybot/i;

let cachedBotResult: boolean | null = null;

function isBotSession(): boolean {
  if (cachedBotResult !== null) return cachedBotResult;
  try {
    const sid = sessionStorage.getItem('offmeta_session_id') || '';
    const suffix = sid.split('-')[1] || '';
    if (KNOWN_BOT_SUFFIXES.has(suffix)) {
      cachedBotResult = true;
      return true;
    }
    const nav = typeof navigator !== 'undefined' ? navigator : null;
    if (nav) {
      // Standard webdriver flag
      if ((nav as Navigator & { webdriver?: boolean }).webdriver === true) {
        cachedBotResult = true;
        return true;
      }
      const ua = nav.userAgent || '';
      if (BOT_UA_PATTERN.test(ua)) {
        cachedBotResult = true;
        return true;
      }
    }
  } catch {
    /* private browsing may throw */
  }
  cachedBotResult = false;
  return false;
}

// UTM parameter capture — stores on first visit per session
const UTM_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const;
const UTM_STORAGE_KEY = 'offmeta_utm';

interface UtmData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

function captureUtmParams(): UtmData {
  // Return cached UTM data if already captured this session
  const cached = sessionStorage.getItem(UTM_STORAGE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached) as UtmData;
    } catch {
      /* fall through */
    }
  }

  const params = new URLSearchParams(window.location.search);
  const utm: UtmData = {};
  let hasAny = false;

  for (const key of UTM_PARAMS) {
    const value = params.get(key);
    if (value) {
      utm[key] = sanitizeString(value);
      hasAny = true;
    }
  }

  if (hasAny) {
    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
  }

  return utm;
}


interface RateLimitData {
  count: number;
  windowStart: number;
}

function getRateLimitData(): RateLimitData {
  try {
    const data = sessionStorage.getItem(RATE_LIMIT_KEY);
    if (!data) return { count: 0, windowStart: Date.now() };
    return JSON.parse(data) as RateLimitData;
  } catch {
    return { count: 0, windowStart: Date.now() };
  }
}

function checkAndUpdateRateLimit(): boolean {
  const now = Date.now();
  const data = getRateLimitData();

  // Reset window if expired
  if (now - data.windowStart > RATE_LIMIT_WINDOW_MS) {
    sessionStorage.setItem(
      RATE_LIMIT_KEY,
      JSON.stringify({
        count: 1,
        windowStart: now,
      }),
    );
    return true;
  }

  // Check limit
  if (data.count >= MAX_EVENTS_PER_WINDOW) {
    return false;
  }

  // Increment count
  sessionStorage.setItem(
    RATE_LIMIT_KEY,
    JSON.stringify({
      count: data.count + 1,
      windowStart: data.windowStart,
    }),
  );
  return true;
}

// Sanitize string values to prevent injection and limit size
function sanitizeString(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.slice(0, MAX_STRING_LENGTH).replace(/[<>]/g, '');
}

// Validate and sanitize event data
function sanitizeEventData(
  data: Record<string, unknown>,
): Record<string, string | number | boolean | null> {
  const sanitized: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(data)) {
    // Sanitize key
    const safeKey = sanitizeString(key);
    if (!safeKey) continue;

    if (typeof value === 'string') {
      sanitized[safeKey] = sanitizeString(value);
    } else if (typeof value === 'number') {
      // Ensure number is finite and reasonable
      sanitized[safeKey] = Number.isFinite(value)
        ? Math.min(Math.abs(value), 1e9)
        : 0;
    } else if (typeof value === 'boolean') {
      sanitized[safeKey] = value;
    } else if (value === null || value === undefined) {
      sanitized[safeKey] = null;
    }
    // Skip complex types (objects, arrays) to prevent abuse
  }

  // Check total size
  const jsonSize = JSON.stringify(sanitized).length;
  if (jsonSize > MAX_EVENT_DATA_SIZE) {
    logger.warn('Event data too large, truncating');
    return {};
  }

  return sanitized;
}

// Validate event type against allowed list
const ALLOWED_EVENT_TYPES = [
  'search',
  'search_started', // NEW: fired the moment a query is submitted (before results/failure resolve)
  'search_results',
  'search_failure', // Track 0-result and error searches
  'first_search_start',
  'first_search_success',
  'first_result_click',
  'first_refinement',
  'first_save',
  'first_return_visit',
  'search_no_result_shown',
  'search_recovery_clicked',
  'search_recovery_success',
  'search_quality_computed',
  'fuzzy_recovery_attempted', // fuzzy card-name resolver was called
  'fuzzy_recovery_resolved',  // resolver returned a canonical name
  'fuzzy_recovery_failed',    // resolver returned null (Scryfall miss / network)
  'guided_suggestion_shown',
  'narrow_results_prompt_shown',
  'fast_click_detected',
  'saved_search_updated',
  'price_change_detected',
  'new_card_match',
  'deck_gap_detected',
  'pro_upgrade_impression',
  'rerun_edited_query',
  'card_click',
  'card_modal_view',
  'deck_click', // NEW: click into a public deck from any surface (browse, archetype, similar)
  'share_clicked', // NEW: fired by SharePageButton / ShareSearchButton on click
  'affiliate_click',
  'pagination',
  'feedback_submitted',
  'landing_page_view',
  'route_view',
  'example_query_impression',
  'example_query_click',
  'example_query_search_success',
  'example_query_result_click',
  'demo_preview_impression',
  'demo_preview_click',
  'demo_preview_card_click',
  'nudge_impression',
  'nudge_click',
  'nudge_dismiss',
  'hero_cta_clicked',
  'web_vital',
] as const;

type EventType = (typeof ALLOWED_EVENT_TYPES)[number];

function isValidEventType(type: string): type is EventType {
  return ALLOWED_EVENT_TYPES.includes(type as EventType);
}

// Deduplication for cache events (only log once per query per session per minute)
const recentCacheEvents = new Map<string, number>();
const CACHE_EVENT_DEDUP_WINDOW_MS = 60000; // 1 minute

function shouldLogCacheEvent(queryHash: string): boolean {
  const now = Date.now();
  const lastLogged = recentCacheEvents.get(queryHash);

  if (lastLogged && now - lastLogged < CACHE_EVENT_DEDUP_WINDOW_MS) {
    return false;
  }

  recentCacheEvents.set(queryHash, now);

  // Cleanup old entries
  if (recentCacheEvents.size > 100) {
    const cutoff = now - CACHE_EVENT_DEDUP_WINDOW_MS;
    for (const [key, time] of recentCacheEvents.entries()) {
      if (time < cutoff) recentCacheEvents.delete(key);
    }
  }

  return true;
}

interface SearchEventData {
  query: string;
  translated_query?: string;
  results_count: number;
  search_duration_ms?: number;
  request_id?: string;
  source?: string; // 'deterministic' | 'ai' | 'cache'
}

interface SearchFailureEventData {
  query: string;
  translated_query?: string;
  error_type: 'zero_results' | 'api_error' | 'timeout' | 'rate_limited';
  error_message?: string;
  search_duration_ms?: number;
}

interface CardClickEventData {
  card_id: string;
  card_name: string;
  set_code: string;
  rarity: string;
  position_in_results?: number;
}

interface CardModalViewEventData {
  card_id: string;
  card_name: string;
  set_code: string;
  tab_viewed?: string;
}

interface AffiliateClickEventData {
  card_id?: string;
  card_name?: string;
  affiliate:
    | 'tcgplayer'
    | 'cardmarket'
    | 'tcgplayer-foil'
    | 'cardmarket-foil'
    | 'cardhoarder';
  price_usd?: string;
  price_eur?: string;
  price_tix?: string;
  is_affiliate_link?: boolean;
  set_code?: string;
}

interface PaginationEventData {
  query: string;
  from_page: number;
  to_page: number;
}

interface FeedbackEventData {
  query: string;
  issue_description: string;
}

interface RerunEditedQueryEventData {
  original_query: string;
  edited_query: string;
  request_id?: string;
}

interface RouteViewEventData {
  path: string;
  search?: string;
  referrer?: string;
  from_path?: string;
  nav_index?: number;
  dwell_ms?: number;
}

interface ExampleQueryEventData {
  query: string;
  category?: string;
  position?: number;
  visible_count?: number;
  results_count?: number;
  card_id?: string;
  card_name?: string;
  is_mobile?: boolean;
}

interface LifecycleEventData {
  query?: string;
  request_id?: string;
  source?: string;
  card_id?: string;
  elapsed_hours?: number;
  suggestion_query?: string;
  search_quality_score?: number;
  refinement_count?: number;
  struggle_count?: number;
  time_to_click_ms?: number;
  action?: string;
  placement?: string;
  cta?: string;
}

interface ShareClickedEventData {
  surface: string;
  url?: string;
  [key: string]: unknown;
}

interface DeckClickEventData {
  deck_id?: string;
  source?: string;
  [key: string]: unknown;
}

interface SearchStartedEventData {
  query?: string;
  [key: string]: unknown;
}

type EventData =
  | SearchEventData
  | SearchFailureEventData
  | CardClickEventData
  | CardModalViewEventData
  | AffiliateClickEventData
  | PaginationEventData
  | FeedbackEventData
  | RerunEditedQueryEventData
  | RouteViewEventData
  | ExampleQueryEventData
  | LifecycleEventData
  | ShareClickedEventData
  | DeckClickEventData
  | SearchStartedEventData;

function shouldTrackOnce(key: string): boolean {
  // Use localStorage so first_* lifecycle events fire at most once per user (browser),
  // not once per tab. Fallback to sessionStorage in privacy modes that block localStorage.
  const storageKey = `offmeta_once:${key}`;
  try {
    if (localStorage.getItem(storageKey) === '1') return false;
    localStorage.setItem(storageKey, '1');
    return true;
  } catch {
    try {
      if (sessionStorage.getItem(storageKey) === '1') return false;
      sessionStorage.setItem(storageKey, '1');
      return true;
    } catch {
      return true;
    }
  }
}

/**
 * Hook for tracking analytics events.
 * All tracking is fire-and-forget to avoid blocking UI.
 * Includes rate limiting (60 events/minute) and input validation.
 */

/**
 * Standalone (non-hook) event fire. Used by IndexShell so the homepage can log
 * a `landing_page_view` without pulling in FullAppProviders. Applies the same
 * validation, rate limit, bot/internal filtering, and UTM tagging as the hook.
 */
export async function trackEventDirect(
  eventType: string,
  eventData: Record<string, unknown> = {},
): Promise<void> {
  try {
    if (!isValidEventType(eventType)) return;
    if (!checkAndUpdateRateLimit()) return;
    if (isBotSession()) return;
    const sanitizedData = sanitizeEventData(eventData);
    const internal = isInternalTraffic();
    if (internal && shouldSuppressInsert()) return;
    const utm = captureUtmParams();
    const searchCount = parseInt(
      sessionStorage.getItem('offmeta_searches_per_session') || '0',
      10,
    );
    const eventPayload: Record<string, string | number | boolean | null> = {
      ...sanitizedData,
      searches_per_session: searchCount,
      ...(internal && { is_internal: true }),
      ...(utm.utm_source && { utm_source: utm.utm_source }),
      ...(utm.utm_medium && { utm_medium: utm.utm_medium }),
      ...(utm.utm_campaign && { utm_campaign: utm.utm_campaign }),
      ...(utm.utm_term && { utm_term: utm.utm_term }),
      ...(utm.utm_content && { utm_content: utm.utm_content }),
    };
    await supabase.from('analytics_events').insert([
      {
        event_type: eventType,
        event_data: eventPayload,
        session_id: getSessionId(),
      },
    ]);
  } catch {
    // Analytics is best-effort; never break the caller.
  }
}

export function useAnalytics() {
  const sessionIdRef = useRef<string | null>(null);
  const utmRef = useRef<UtmData>({});

  useEffect(() => {
    sessionIdRef.current = getSessionId();
    utmRef.current = captureUtmParams();

    const firstVisitKey = 'offmeta_first_visit_at';
    const now = Date.now();
    const firstVisitRaw = localStorage.getItem(firstVisitKey);

    if (!firstVisitRaw) {
      localStorage.setItem(firstVisitKey, String(now));
    }
  }, []);

  const trackEvent = useCallback(
    async (eventType: EventType, eventData: EventData) => {
      try {
        // Validate event type
        if (!isValidEventType(eventType)) {
          logger.warn('Invalid event type:', eventType);
          return;
        }

        // Check rate limit
        if (!checkAndUpdateRateLimit()) {
          logger.warn('Analytics rate limit exceeded');
          return;
        }

        // Sanitize event data - cast through unknown for type safety
        const sanitizedData = sanitizeEventData(
          eventData as unknown as Record<string, unknown>,
        );

        // Bot traffic — drop entirely so dashboards reflect humans only.
        if (isBotSession()) {
          return;
        }

        // Internal traffic handling
        const internal = isInternalTraffic();
        if (internal && shouldSuppressInsert()) {
          logger.debug('Analytics suppressed (internal/preview)');
          return;
        }

        // Fire and forget - don't await to avoid blocking
        const searchCount = parseInt(
          sessionStorage.getItem('offmeta_searches_per_session') || '0',
          10,
        );
        const utm = utmRef.current;
        const eventPayload: Record<string, string | number | boolean | null> = {
          ...sanitizedData,
          searches_per_session: searchCount,
          ...(internal && { is_internal: true }),
          ...(utm.utm_source && { utm_source: utm.utm_source }),
          ...(utm.utm_medium && { utm_medium: utm.utm_medium }),
          ...(utm.utm_campaign && { utm_campaign: utm.utm_campaign }),
          ...(utm.utm_term && { utm_term: utm.utm_term }),
          ...(utm.utm_content && { utm_content: utm.utm_content }),
        };
        const startedAt = performance.now();
        supabase
          .from('analytics_events')
          .insert([
            {
              event_type: eventType,
              event_data: eventPayload,
              session_id: sessionIdRef.current,
            },
          ])
          .then(({ error }) => {
            const durationMs = performance.now() - startedAt;
            if (durationMs > INSERT_WARN_LATENCY_MS) {
              logger.warn('Analytics insert latency high', {
                eventType,
                durationMs: Math.round(durationMs),
              });
            }
            if (error) {
              logger.warn('Analytics tracking failed', {
                eventType,
                durationMs: Math.round(durationMs),
                code: error.code,
              });
            }
          });
      } catch {
        // Silently fail - analytics should never break the app
      }
    },
    [],
  );

  const trackSearch = useCallback(
    (data: SearchEventData) => {
      trackEvent('search', data);
    },
    [trackEvent],
  );

  const trackCardClick = useCallback(
    (data: CardClickEventData) => {
      trackEvent('card_click', data);
    },
    [trackEvent],
  );

  const trackCardModalView = useCallback(
    (data: CardModalViewEventData) => {
      trackEvent('card_modal_view', data);
    },
    [trackEvent],
  );

  const trackAffiliateClick = useCallback(
    (data: AffiliateClickEventData) => {
      trackEvent('affiliate_click', data);
    },
    [trackEvent],
  );

  const trackShareClicked = useCallback(
    (data: ShareClickedEventData = { surface: 'unknown' }) => {
      trackEvent('share_clicked', data);
    },
    [trackEvent],
  );

  const trackDeckClick = useCallback(
    (data: DeckClickEventData = {}) => {
      trackEvent('deck_click', data);
    },
    [trackEvent],
  );

  const trackSearchStarted = useCallback(
    (data: SearchStartedEventData = {}) => {
      trackEvent('search_started', data);
    },
    [trackEvent],
  );


  const trackPagination = useCallback(
    (data: PaginationEventData) => {
      trackEvent('pagination', data);
    },
    [trackEvent],
  );

  const trackFeedback = useCallback(
    (data: FeedbackEventData) => {
      trackEvent('feedback_submitted', data);
    },
    [trackEvent],
  );

  const trackSearchFailure = useCallback(
    (data: SearchFailureEventData) => {
      trackEvent('search_failure', data);
    },
    [trackEvent],
  );

  const trackLandingPageView = useCallback(
    (data: RouteViewEventData) => {
      trackEvent('landing_page_view', data);
    },
    [trackEvent],
  );

  const trackRouteView = useCallback(
    (data: RouteViewEventData) => {
      trackEvent('route_view', data);
    },
    [trackEvent],
  );

  const trackExampleQueryImpression = useCallback(
    (data: ExampleQueryEventData) => {
      trackEvent('example_query_impression', data);
    },
    [trackEvent],
  );

  const trackExampleQueryClick = useCallback(
    (data: ExampleQueryEventData) => {
      trackEvent('example_query_click', data);
    },
    [trackEvent],
  );

  const trackExampleQuerySearchSuccess = useCallback(
    (data: ExampleQueryEventData) => {
      trackEvent('example_query_search_success', data);
    },
    [trackEvent],
  );

  const trackExampleQueryResultClick = useCallback(
    (data: ExampleQueryEventData) => {
      trackEvent('example_query_result_click', data);
    },
    [trackEvent],
  );

  const trackFirstSearchStart = useCallback(
    (data: LifecycleEventData) => {
      if (!shouldTrackOnce('first_search_start')) return;
      trackEvent('first_search_start', data);
    },
    [trackEvent],
  );

  const trackFirstSearchSuccess = useCallback(
    (data: LifecycleEventData) => {
      if (!shouldTrackOnce('first_search_success')) return;
      trackEvent('first_search_success', data);
    },
    [trackEvent],
  );

  const trackFirstResultClick = useCallback(
    (data: LifecycleEventData) => {
      if (!shouldTrackOnce('first_result_click')) return;
      trackEvent('first_result_click', data);
    },
    [trackEvent],
  );

  const trackFirstRefinement = useCallback(
    (data: LifecycleEventData) => {
      if (!shouldTrackOnce('first_refinement')) return;
      trackEvent('first_refinement', data);
    },
    [trackEvent],
  );

  const trackFirstSave = useCallback(
    (data: LifecycleEventData) => {
      if (!shouldTrackOnce('first_save')) return;
      trackEvent('first_save', data);
    },
    [trackEvent],
  );

  const trackFirstReturnVisit = useCallback(() => {
    const firstVisitRaw = localStorage.getItem('offmeta_first_visit_at');
    if (!firstVisitRaw) return;
    const firstVisitTs = parseInt(firstVisitRaw, 10);
    const now = Date.now();
    const twelveHoursMs = 12 * 60 * 60 * 1000;
    if (!Number.isFinite(firstVisitTs) || now - firstVisitTs < twelveHoursMs) {
      return;
    }
    if (!shouldTrackOnce('first_return_visit')) return;
    trackEvent('first_return_visit', {
      elapsed_hours: Math.floor((now - firstVisitTs) / (60 * 60 * 1000)),
    });
  }, [trackEvent]);

  return {
    trackSearch,
    trackSearchStarted,
    trackSearchFailure,
    trackCardClick,
    trackCardModalView,
    trackAffiliateClick,
    trackShareClicked,
    trackDeckClick,
    trackPagination,
    trackFeedback,
    trackLandingPageView,
    trackRouteView,
    trackExampleQueryImpression,
    trackExampleQueryClick,
    trackExampleQuerySearchSuccess,
    trackExampleQueryResultClick,
    trackFirstSearchStart,
    trackFirstSearchSuccess,
    trackFirstResultClick,
    trackFirstRefinement,
    trackFirstSave,
    trackFirstReturnVisit,
    trackEvent,
    shouldLogCacheEvent,
  };
}
