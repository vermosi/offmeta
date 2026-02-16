
-- Aggregated analytics RPC to avoid 1000-row query limit
CREATE OR REPLACE FUNCTION public.get_search_analytics(since_date timestamptz, max_low_confidence integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
  summary_data jsonb;
  source_data jsonb;
  confidence_data jsonb;
  daily_data jsonb;
  event_data jsonb;
  low_conf_data jsonb;
BEGIN
  -- Summary stats
  SELECT jsonb_build_object(
    'totalSearches', COUNT(*),
    'avgConfidence', ROUND(COALESCE(AVG(confidence_score), 0)::numeric, 2),
    'avgResponseTime', ROUND(COALESCE(AVG(response_time_ms), 0)),
    'fallbackRate', CASE WHEN COUNT(*) > 0
      THEN ROUND((COUNT(*) FILTER (WHERE fallback_used = true)::numeric / COUNT(*)::numeric) * 100)
      ELSE 0 END
  ) INTO summary_data
  FROM translation_logs
  WHERE created_at >= since_date;

  -- Source breakdown
  SELECT COALESCE(jsonb_object_agg(src, cnt), '{}'::jsonb) INTO source_data
  FROM (
    SELECT COALESCE(source, 'ai') AS src, COUNT(*) AS cnt
    FROM translation_logs
    WHERE created_at >= since_date
    GROUP BY COALESCE(source, 'ai')
  ) s;

  -- Confidence buckets
  SELECT jsonb_build_object(
    'high', COUNT(*) FILTER (WHERE COALESCE(confidence_score, 0) >= 0.8),
    'medium', COUNT(*) FILTER (WHERE COALESCE(confidence_score, 0) >= 0.6 AND COALESCE(confidence_score, 0) < 0.8),
    'low', COUNT(*) FILTER (WHERE COALESCE(confidence_score, 0) < 0.6)
  ) INTO confidence_data
  FROM translation_logs
  WHERE created_at >= since_date;

  -- Daily volume
  SELECT COALESCE(jsonb_object_agg(day, cnt), '{}'::jsonb) INTO daily_data
  FROM (
    SELECT created_at::date::text AS day, COUNT(*) AS cnt
    FROM translation_logs
    WHERE created_at >= since_date
    GROUP BY created_at::date
    ORDER BY created_at::date
  ) d;

  -- Event type breakdown
  SELECT COALESCE(jsonb_object_agg(et, cnt), '{}'::jsonb) INTO event_data
  FROM (
    SELECT event_type AS et, COUNT(*) AS cnt
    FROM analytics_events
    WHERE created_at >= since_date
    GROUP BY event_type
  ) e;

  -- Low confidence queries (most recent N)
  SELECT COALESCE(jsonb_agg(row_to_json(lc)), '[]'::jsonb) INTO low_conf_data
  FROM (
    SELECT
      natural_language_query AS query,
      translated_query AS translated,
      confidence_score AS confidence,
      source,
      created_at AS time
    FROM translation_logs
    WHERE created_at >= since_date
      AND COALESCE(confidence_score, 0) < 0.6
    ORDER BY created_at DESC
    LIMIT max_low_confidence
  ) lc;

  result := jsonb_build_object(
    'summary', summary_data,
    'sourceBreakdown', source_data,
    'confidenceBuckets', confidence_data,
    'dailyVolume', daily_data,
    'eventBreakdown', event_data,
    'lowConfidenceQueries', low_conf_data
  );

  RETURN result;
END;
$$;
