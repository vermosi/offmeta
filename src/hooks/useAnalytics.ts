/**
 * Analytics tracking hook for capturing user interactions.
 * Tracks searches, card clicks, modal views, affiliate clicks, and pagination.
 * Includes rate limiting and input validation to prevent abuse.
 */

import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/core/logger';

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

type EventData =
  | SearchEventData
  | SearchFailureEventData
  | CardClickEventData
  | CardModalViewEventData
  | AffiliateClickEventData
  | PaginationEventData
  | FeedbackEventData
  | RerunEditedQueryEventData;

/**
 * Hook for tracking analytics events.
 * All tracking is fire-and-forget to avoid blocking UI.
 * Includes rate limiting (60 events/minute) and input validation.
 */
export function useAnalytics() {
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    sessionIdRef.current = getSessionId();
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

        // Fire and forget - don't await to avoid blocking
        supabase
          .from('analytics_events')
          .insert([
            {
              event_type: eventType,
              event_data: sanitizedData,
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

  return {
    trackSearch,
    trackSearchFailure,
    trackCardClick,
    trackCardModalView,
    trackAffiliateClick,
    trackPagination,
    trackFeedback,
    trackEvent,
    shouldLogCacheEvent,
  };
}
