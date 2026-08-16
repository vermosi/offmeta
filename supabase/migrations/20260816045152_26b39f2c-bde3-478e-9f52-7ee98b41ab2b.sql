ALTER TABLE public.translation_logs ADD COLUMN IF NOT EXISTS request_id text;

CREATE INDEX IF NOT EXISTS idx_translation_logs_request_id
  ON public.translation_logs (request_id)
  WHERE request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION admin_api.get_search_health_metrics(days_back integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'admin_api'
AS $function$
DECLARE
  since timestamptz := now() - make_interval(days => greatest(coalesce(days_back, 7), 1));
  result jsonb;
BEGIN
  WITH logs AS (
    SELECT
      coalesce(nullif(source, ''), 'unknown') AS source,
      coalesce(fallback_used, false) AS fallback_used,
      response_time_ms,
      result_count,
      request_id
    FROM public.translation_logs
    WHERE created_at >= since
  ),
  outcomes AS (
    SELECT DISTINCT ON (event_data->>'request_id')
      event_data->>'request_id' AS request_id,
      coalesce((event_data->>'result_count')::int, 0) AS result_count
    FROM public.analytics_events
    WHERE created_at >= since
      AND event_type IN ('search_success', 'search_failure')
      AND nullif(event_data->>'request_id', '') IS NOT NULL
      AND (event_data->>'is_internal') IS NULL
    ORDER BY event_data->>'request_id', created_at DESC
  ),
  joined AS (
    SELECT
      l.source,
      l.fallback_used,
      l.response_time_ms,
      coalesce(l.result_count, o.result_count) AS results
    FROM logs l
    LEFT JOIN outcomes o ON o.request_id = l.request_id
  ),
  totals AS (
    SELECT count(*)::numeric AS total FROM joined
  )
  SELECT jsonb_build_object(
    'window_days', greatest(coalesce(days_back, 7), 1),
    'generated_at', now(),
    'total_translations', (SELECT total FROM totals),
    'deterministic_share', (
      SELECT round(100.0 * count(*) FILTER (
        WHERE source IN ('deterministic', 'pattern_match', 'raw_syntax')
      ) / nullif((SELECT total FROM totals), 0), 1)
      FROM joined
    ),
    'cache_share', (
      SELECT round(100.0 * count(*) FILTER (WHERE source = 'cache')
        / nullif((SELECT total FROM totals), 0), 1)
      FROM joined
    ),
    'fallback_rate', (
      SELECT round(100.0 * count(*) FILTER (WHERE fallback_used)
        / nullif((SELECT total FROM totals), 0), 1)
      FROM joined
    ),
    'zero_result_rate', (
      SELECT round(100.0 * count(*) FILTER (WHERE results = 0)
        / nullif(count(*) FILTER (WHERE results IS NOT NULL), 0), 1)
      FROM joined
    ),
    'measured_result_coverage', (
      SELECT round(100.0 * count(*) FILTER (WHERE results IS NOT NULL)
        / nullif((SELECT total FROM totals), 0), 1)
      FROM joined
    ),
    'by_source', (
      SELECT coalesce(jsonb_agg(row ORDER BY row->>'source'), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'source', source,
          'count', count(*),
          'share', round(100.0 * count(*) / nullif((SELECT total FROM totals), 0), 1),
          'fallback_rate', round(100.0 * count(*) FILTER (WHERE fallback_used)
            / nullif(count(*), 0), 1),
          'zero_result_rate', round(100.0 * count(*) FILTER (WHERE results = 0)
            / nullif(count(*) FILTER (WHERE results IS NOT NULL), 0), 1),
          'measured', count(*) FILTER (WHERE results IS NOT NULL),
          'latency_p50', percentile_disc(0.5) WITHIN GROUP (ORDER BY response_time_ms),
          'latency_p95', percentile_disc(0.95) WITHIN GROUP (ORDER BY response_time_ms)
        ) AS row
        FROM joined
        GROUP BY source
      ) s
    ),
    'latency_p95', (
      SELECT percentile_disc(0.95) WITHIN GROUP (ORDER BY response_time_ms) FROM joined
    )
  ) INTO result;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_search_health_metrics(days_back integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'admin_api'
AS $function$
BEGIN
  IF current_user <> 'service_role'
     AND current_setting('request.jwt.claim.role', true) <> 'service_role'
     AND NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;
  RETURN admin_api.get_search_health_metrics(days_back);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_search_health_metrics(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_search_health_metrics(integer) TO authenticated, service_role;