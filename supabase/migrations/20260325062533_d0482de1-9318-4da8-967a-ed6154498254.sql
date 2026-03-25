
-- Update get_search_analytics to exclude internal traffic by default
CREATE OR REPLACE FUNCTION public.get_search_analytics(since_date timestamp with time zone, max_low_confidence integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb; summary_data jsonb; source_data jsonb; confidence_data jsonb;
  daily_data jsonb; event_data jsonb; low_conf_data jsonb; popular_data jsonb;
  percentile_data jsonb; coverage_data jsonb;
BEGIN
  IF NOT public.has_role('admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;

  SELECT jsonb_build_object(
    'totalSearches', COUNT(*),
    'avgConfidence', ROUND(COALESCE(AVG(confidence_score), 0)::numeric, 2),
    'avgResponseTime', ROUND(COALESCE(AVG(response_time_ms), 0)),
    'fallbackRate', CASE WHEN COUNT(*) > 0
      THEN ROUND((COUNT(*) FILTER (WHERE fallback_used = true)::numeric / COUNT(*)::numeric) * 100)
      ELSE 0 END
  ) INTO summary_data FROM translation_logs
  WHERE created_at >= since_date
    AND LOWER(TRIM(natural_language_query)) NOT IN ('ping warmup', 'warmup');

  SELECT COALESCE(jsonb_object_agg(src, cnt), '{}'::jsonb) INTO source_data
  FROM (SELECT COALESCE(source, 'ai') AS src, COUNT(*) AS cnt FROM translation_logs
    WHERE created_at >= since_date
      AND LOWER(TRIM(natural_language_query)) NOT IN ('ping warmup', 'warmup')
    GROUP BY COALESCE(source, 'ai')) s;

  SELECT jsonb_build_object(
    'high', COUNT(*) FILTER (WHERE COALESCE(confidence_score, 0) >= 0.8),
    'medium', COUNT(*) FILTER (WHERE COALESCE(confidence_score, 0) >= 0.6 AND COALESCE(confidence_score, 0) < 0.8),
    'low', COUNT(*) FILTER (WHERE COALESCE(confidence_score, 0) < 0.6)
  ) INTO confidence_data FROM translation_logs
  WHERE created_at >= since_date
    AND LOWER(TRIM(natural_language_query)) NOT IN ('ping warmup', 'warmup');

  SELECT COALESCE(jsonb_object_agg(day, cnt), '{}'::jsonb) INTO daily_data
  FROM (SELECT created_at::date::text AS day, COUNT(*) AS cnt FROM translation_logs
    WHERE created_at >= since_date
      AND LOWER(TRIM(natural_language_query)) NOT IN ('ping warmup', 'warmup')
    GROUP BY created_at::date ORDER BY created_at::date) d;

  -- Filter internal traffic from analytics_events
  SELECT COALESCE(jsonb_object_agg(et, cnt), '{}'::jsonb) INTO event_data
  FROM (SELECT event_type AS et, COUNT(*) AS cnt FROM analytics_events
    WHERE created_at >= since_date
      AND COALESCE(event_data->>'is_internal', 'false') <> 'true'
    GROUP BY event_type) e;

  SELECT COALESCE(jsonb_agg(row_to_json(lc)), '[]'::jsonb) INTO low_conf_data
  FROM (SELECT natural_language_query AS query, translated_query AS translated, confidence_score AS confidence, source, created_at AS time
    FROM translation_logs
    WHERE created_at >= since_date AND COALESCE(confidence_score, 0) < 0.6
      AND LOWER(TRIM(natural_language_query)) NOT IN ('ping warmup', 'warmup')
    ORDER BY created_at DESC LIMIT max_low_confidence) lc;

  SELECT COALESCE(jsonb_agg(row_to_json(pq)), '[]'::jsonb) INTO popular_data
  FROM (SELECT LOWER(TRIM(natural_language_query)) AS query, COUNT(*) AS count, ROUND(AVG(COALESCE(confidence_score, 0))::numeric, 2) AS avg_confidence,
    MODE() WITHIN GROUP (ORDER BY COALESCE(source, 'ai')) AS primary_source
    FROM translation_logs
    WHERE created_at >= since_date
      AND LOWER(TRIM(natural_language_query)) NOT IN ('ping warmup', 'warmup')
      AND natural_language_query !~ '(?:t:\s*){4,}'
    GROUP BY LOWER(TRIM(natural_language_query)) ORDER BY COUNT(*) DESC LIMIT 20) pq;

  SELECT jsonb_build_object(
    'p50', COALESCE((SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) FROM translation_logs WHERE created_at >= since_date AND response_time_ms IS NOT NULL AND LOWER(TRIM(natural_language_query)) NOT IN ('ping warmup', 'warmup'))::integer, 0),
    'p95', COALESCE((SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) FROM translation_logs WHERE created_at >= since_date AND response_time_ms IS NOT NULL AND LOWER(TRIM(natural_language_query)) NOT IN ('ping warmup', 'warmup'))::integer, 0),
    'p99', COALESCE((SELECT PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) FROM translation_logs WHERE created_at >= since_date AND response_time_ms IS NOT NULL AND LOWER(TRIM(natural_language_query)) NOT IN ('ping warmup', 'warmup'))::integer, 0)
  ) INTO percentile_data;

  SELECT COALESCE(jsonb_object_agg(day, pct), '{}'::jsonb) INTO coverage_data
  FROM (SELECT created_at::date::text AS day,
    ROUND((COUNT(*) FILTER (WHERE COALESCE(source, 'ai') IN ('deterministic', 'pattern_match'))::numeric / GREATEST(COUNT(*), 1)::numeric) * 100) AS pct
    FROM translation_logs
    WHERE created_at >= since_date
      AND LOWER(TRIM(natural_language_query)) NOT IN ('ping warmup', 'warmup')
    GROUP BY created_at::date ORDER BY created_at::date) dc;

  result := jsonb_build_object(
    'summary', summary_data, 'sourceBreakdown', source_data, 'confidenceBuckets', confidence_data,
    'dailyVolume', daily_data, 'eventBreakdown', event_data, 'lowConfidenceQueries', low_conf_data,
    'popularQueries', popular_data, 'responsePercentiles', percentile_data, 'deterministicCoverage', coverage_data
  );
  RETURN result;
END;
$function$;

-- Update get_conversion_funnel to exclude internal traffic by default
CREATE OR REPLACE FUNCTION public.get_conversion_funnel(days_back integer DEFAULT 90)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      AND COALESCE(event_data->>'is_internal', 'false') <> 'true'
    GROUP BY COALESCE(session_id, 'unknown')
  ),
  event_totals AS (
    SELECT
      event_type,
      count(*) AS cnt
    FROM analytics_events
    WHERE created_at >= since_ts
      AND event_type IN ('search', 'card_click', 'card_modal_view', 'affiliate_click')
      AND COALESCE(event_data->>'is_internal', 'false') <> 'true'
    GROUP BY event_type
  ),
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
      AND COALESCE(event_data->>'is_internal', 'false') <> 'true'
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
$function$;
