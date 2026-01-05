/**
 * Analytics tracking hook for capturing user interactions.
 * Tracks searches, card clicks, modal views, affiliate clicks, and pagination.
 */

import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// Generate or retrieve a session ID for anonymous tracking
const getSessionId = (): string => {
  const key = "offmeta_session_id";
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem(key, sessionId);
  }
  return sessionId;
};

type EventType = 
  | "search" 
  | "card_click" 
  | "card_modal_view" 
  | "affiliate_click" 
  | "pagination"
  | "feedback_submitted";

interface SearchEventData {
  query: string;
  translated_query?: string;
  results_count: number;
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
  affiliate: "tcgplayer" | "cardmarket";
  price_usd?: string;
  price_eur?: string;
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

type EventData = 
  | SearchEventData 
  | CardClickEventData 
  | CardModalViewEventData 
  | AffiliateClickEventData 
  | PaginationEventData
  | FeedbackEventData;

/**
 * Hook for tracking analytics events.
 * All tracking is fire-and-forget to avoid blocking UI.
 */
export function useAnalytics() {
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    sessionIdRef.current = getSessionId();
  }, []);

  const trackEvent = useCallback(async (eventType: EventType, eventData: EventData) => {
    try {
      // Fire and forget - don't await to avoid blocking
      supabase
        .from("analytics_events")
        .insert([{
          event_type: eventType,
          event_data: JSON.parse(JSON.stringify(eventData)),
          session_id: sessionIdRef.current,
        }])
        .then(({ error }) => {
          if (error) {
            console.warn("Analytics tracking failed:", error.message);
          }
        });
    } catch (err) {
      // Silently fail - analytics should never break the app
      console.warn("Analytics error:", err);
    }
  }, []);

  const trackSearch = useCallback((data: SearchEventData) => {
    trackEvent("search", data);
  }, [trackEvent]);

  const trackCardClick = useCallback((data: CardClickEventData) => {
    trackEvent("card_click", data);
  }, [trackEvent]);

  const trackCardModalView = useCallback((data: CardModalViewEventData) => {
    trackEvent("card_modal_view", data);
  }, [trackEvent]);

  const trackAffiliateClick = useCallback((data: AffiliateClickEventData) => {
    trackEvent("affiliate_click", data);
  }, [trackEvent]);

  const trackPagination = useCallback((data: PaginationEventData) => {
    trackEvent("pagination", data);
  }, [trackEvent]);

  const trackFeedback = useCallback((data: FeedbackEventData) => {
    trackEvent("feedback_submitted", data);
  }, [trackEvent]);

  return {
    trackSearch,
    trackCardClick,
    trackCardModalView,
    trackAffiliateClick,
    trackPagination,
    trackFeedback,
  };
}
