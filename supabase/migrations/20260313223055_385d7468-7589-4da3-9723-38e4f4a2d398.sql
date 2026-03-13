CREATE OR REPLACE FUNCTION public.get_conversion_funnel(days_back integer DEFAULT 90)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  since_ts timestamptz;
  result jsonb;
BEGIN
  IF NOT public.has_role('admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;

  since_ts := now() - make_interval(days => days_back);

  WITH session_events AS (
    SELECT
      COALESCE(session_id, 'unknown') AS sid,
      array_agg(DISTINCT event_type) AS types
    FROM analytics_events
    WHERE created_at >= since_ts
      AND event_type IN ('search', 'card_click', 'card_modal_view', 'affiliate_click')
    GROUP BY COALESCE(session_id, 'unknown')
  ),
  event_totals AS (
    SELECT
      event_type,
      count(*) AS cnt
    FROM analytics_events
    WHERE created_at >= since_ts
      AND event_type IN ('search', 'card_click', 'card_modal_view', 'affiliate_click')
    GROUP BY event_type
  ),
  -- Sequential funnel: each step requires previous steps
  sequential AS (
    SELECT
      count(*) AS total_sessions,
      count(*) FILTER (WHERE 'search' = ANY(types)) AS searched_sessions,
      count(*) FILTER (
        WHERE 'search' = ANY(types)
          AND ('card_click' = ANY(types) OR 'card_modal_view' = ANY(types))
      ) AS clicked_sessions,
      count(*) FILTER (
        WHERE 'search' = ANY(types)
          AND ('card_click' = ANY(types) OR 'card_modal_view' = ANY(types))
          AND 'affiliate_click' = ANY(types)
      ) AS affiliate_sessions
    FROM session_events
  ),
  -- Non-sequential: independent counts per step
  independent AS (
    SELECT
      count(*) AS total_sessions,
      count(*) FILTER (WHERE 'search' = ANY(types)) AS searched_sessions,
      count(*) FILTER (WHERE 'card_click' = ANY(types) OR 'card_modal_view' = ANY(types)) AS clicked_sessions,
      count(*) FILTER (WHERE 'affiliate_click' = ANY(types)) AS affiliate_sessions
    FROM session_events
  ),
  utm_data AS (
    SELECT
      event_data->>'utm_source' AS source,
      COALESCE(session_id, 'unknown') AS sid,
      event_type
    FROM analytics_events
    WHERE created_at >= since_ts
      AND event_type IN ('search', 'card_click', 'card_modal_view', 'affiliate_click')
      AND event_data->>'utm_source' IS NOT NULL
  ),
  utm_agg AS (
    SELECT
      source,
      count(DISTINCT sid) AS sessions,
      count(DISTINCT sid) FILTER (WHERE event_type = 'search') AS searches,
      count(DISTINCT sid) FILTER (WHERE event_type IN ('card_click', 'card_modal_view')) AS clicks,
      count(DISTINCT sid) FILTER (WHERE event_type = 'affiliate_click') AS affiliates
    FROM utm_data
    GROUP BY source
    ORDER BY count(DISTINCT sid) DESC
    LIMIT 10
  )
  SELECT jsonb_build_object(
    'sequential', (
      SELECT jsonb_build_object(
        'totalSessions', s.total_sessions,
        'searchedSessions', s.searched_sessions,
        'clickedSessions', s.clicked_sessions,
        'affiliateSessions', s.affiliate_sessions
      ) FROM sequential s
    ),
    'independent', (
      SELECT jsonb_build_object(
        'totalSessions', i.total_sessions,
        'searchedSessions', i.searched_sessions,
        'clickedSessions', i.clicked_sessions,
        'affiliateSessions', i.affiliate_sessions
      ) FROM independent i
    ),
    'eventTotals', (
      SELECT jsonb_object_agg(event_type, cnt) FROM event_totals
    ),
    'utmSources', COALESCE((SELECT jsonb_agg(row_to_json(u)) FROM utm_agg u), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;