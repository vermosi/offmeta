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

/** Retrieve stored UTM data from session storage. */
export function getUtmData(): UtmData {
  try {
    const data = sessionStorage.getItem(UTM_STORAGE_KEY);
    return data ? (JSON.parse(data) as UtmData) : {};
  } catch {
    return {};
  }
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
  'search_results',
  'search_failure', // NEW: Track 0-result and error searches
  'rerun_edited_query',
  'card_click',
  'card_modal_view',
  'affiliate_click',
  'pagination',
  'feedback_submitted',
  'landing_page_view',
  'route_view',
  'example_query_impression',
  'example_query_click',
  'example_query_search_success',
  'example_query_result_click',
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
  | ExampleQueryEventData;

/**
 * Hook for tracking analytics events.
 * All tracking is fire-and-forget to avoid blocking UI.
 * Includes rate limiting (60 events/minute) and input validation.
 */
export function useAnalytics() {
  const sessionIdRef = useRef<string | null>(null);
  const utmRef = useRef<UtmData>({});

  useEffect(() => {
    sessionIdRef.current = getSessionId();
    utmRef.current = captureUtmParams();
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
            if (error) {
              logger.warn('Analytics tracking failed');
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

  return {
    trackSearch,
    trackSearchFailure,
    trackCardClick,
    trackCardModalView,
    trackAffiliateClick,
    trackPagination,
    trackFeedback,
    trackLandingPageView,
    trackRouteView,
    trackExampleQueryImpression,
    trackExampleQueryClick,
    trackExampleQuerySearchSuccess,
    trackExampleQueryResultClick,
    trackEvent,
    shouldLogCacheEvent,
  };
}
