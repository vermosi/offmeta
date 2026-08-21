ALTER TABLE public.translation_logs ADD COLUMN IF NOT EXISTS app_version text;

CREATE INDEX IF NOT EXISTS idx_translation_logs_app_version_created
  ON public.translation_logs (app_version, created_at DESC)
  WHERE app_version IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_translation_logs_created_confidence
  ON public.translation_logs (created_at DESC, confidence_score);

CREATE OR REPLACE FUNCTION admin_api.get_confidence_monitor(
  days_back integer DEFAULT 7,
  deploy_limit integer DEFAULT 6,
  low_threshold numeric DEFAULT 0.75
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'admin_api'
AS $function$
DECLARE
  since timestamptz := now() - make_interval(days => greatest(coalesce(days_back, 7), 1));
  thr numeric := greatest(least(coalesce(low_threshold, 0.75), 1), 0);
  cap integer := greatest(least(coalesce(deploy_limit, 6), 20), 1);
  result jsonb;
BEGIN
  WITH logs AS (
    SELECT
      coalesce(nullif(l.app_version, ''), 'unknown') AS app_version,
      coalesce(nullif(l.source, ''), 'unknown') AS source,
      coalesce(l.confidence_score, 0)::numeric AS confidence,
      l.result_count,
      l.response_time_ms,
      l.created_at,
      lower(btrim(l.natural_language_query)) AS query,
      l.translated_query
    FROM public.translation_logs l
    WHERE l.created_at >= since
      AND btrim(coalesce(l.natural_language_query, '')) <> ''
  ),
  totals AS (SELECT count(*)::numeric AS total FROM logs),
  deploys AS (
    SELECT
      app_version,
      count(*) AS count,
      round(avg(confidence), 3) AS avg_confidence,
      round(100.0 * count(*) FILTER (WHERE confidence >= thr) / nullif(count(*), 0), 1) AS healthy_share,
      round(100.0 * count(*) FILTER (WHERE result_count = 0)
        / nullif(count(*) FILTER (WHERE result_count IS NOT NULL), 0), 1) AS zero_result_rate,
      percentile_disc(0.95) WITHIN GROUP (ORDER BY response_time_ms) AS latency_p95,
      min(created_at) AS first_seen,
      max(created_at) AS last_seen
    FROM logs
    GROUP BY app_version
    ORDER BY max(created_at) DESC
    LIMIT cap
  ),
  sources AS (
    SELECT
      source,
      count(*) AS count,
      round(avg(confidence), 3) AS avg_confidence,
      round(100.0 * count(*) FILTER (WHERE confidence < thr) / nullif(count(*), 0), 1) AS low_confidence_rate
    FROM logs
    GROUP BY source
    ORDER BY count(*) FILTER (WHERE confidence < thr) DESC
    LIMIT 12
  ),
  failing AS (
    SELECT
      query,
      count(*) AS count,
      round(avg(confidence), 3) AS avg_confidence,
      count(*) FILTER (WHERE result_count = 0) AS zero_results,
      (array_agg(translated_query ORDER BY created_at DESC))[1] AS last_translation,
      max(created_at) AS last_seen
    FROM logs
    WHERE confidence < thr
    GROUP BY query
    ORDER BY count(*) DESC, avg(confidence) ASC
    LIMIT 25
  )
  SELECT jsonb_build_object(
    'window_days', greatest(coalesce(days_back, 7), 1),
    'generated_at', now(),
    'target_healthy_share', 75,
    'low_threshold', thr,
    'total_translations', (SELECT total FROM totals),
    'avg_confidence', (SELECT round(avg(confidence), 3) FROM logs),
    'healthy_share', (
      SELECT round(100.0 * count(*) FILTER (WHERE confidence >= thr)
        / nullif((SELECT total FROM totals), 0), 1) FROM logs
    ),
    'low_confidence_rate', (
      SELECT round(100.0 * count(*) FILTER (WHERE confidence < thr)
        / nullif((SELECT total FROM totals), 0), 1) FROM logs
    ),
    'zero_result_rate', (
      SELECT round(100.0 * count(*) FILTER (WHERE result_count = 0)
        / nullif(count(*) FILTER (WHERE result_count IS NOT NULL), 0), 1) FROM logs
    ),
    'by_deploy', coalesce((SELECT jsonb_agg(to_jsonb(d)) FROM deploys d), '[]'::jsonb),
    'by_source', coalesce((SELECT jsonb_agg(to_jsonb(s)) FROM sources s), '[]'::jsonb),
    'top_failing', coalesce((SELECT jsonb_agg(to_jsonb(f)) FROM failing f), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_confidence_monitor(
  days_back integer DEFAULT 7,
  deploy_limit integer DEFAULT 6,
  low_threshold numeric DEFAULT 0.75
)
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
  RETURN admin_api.get_confidence_monitor(days_back, deploy_limit, low_threshold);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_confidence_monitor(integer, integer, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_confidence_monitor(integer, integer, numeric) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION admin_api.get_low_confidence_candidates(
  since_date timestamp with time zone DEFAULT (now() - interval '30 days'),
  min_frequency integer DEFAULT 2,
  max_results integer DEFAULT 25,
  max_confidence numeric DEFAULT 0.75
)
RETURNS TABLE(query text, frequency bigint, avg_confidence numeric, last_translation text, zero_results bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'admin_api'
AS $function$
  WITH logs AS (
    SELECT
      lower(btrim(l.natural_language_query)) AS q,
      coalesce(l.confidence_score, 0)::numeric AS confidence,
      l.result_count,
      l.translated_query,
      l.created_at
    FROM public.translation_logs l
    WHERE l.created_at >= since_date
      AND btrim(coalesce(l.natural_language_query, '')) <> ''
      AND char_length(btrim(l.natural_language_query)) BETWEEN 3 AND 160
  ),
  grouped AS (
    SELECT
      q AS query,
      count(*) AS frequency,
      round(avg(confidence), 3) AS avg_confidence,
      (array_agg(translated_query ORDER BY created_at DESC))[1] AS last_translation,
      count(*) FILTER (WHERE result_count = 0) AS zero_results
    FROM logs
    GROUP BY q
    HAVING avg(confidence) < greatest(least(coalesce(max_confidence, 0.75), 1), 0)
       AND count(*) >= greatest(coalesce(min_frequency, 2), 1)
  )
  SELECT g.query, g.frequency, g.avg_confidence, g.last_translation, g.zero_results
  FROM grouped g
  WHERE NOT EXISTS (
    SELECT 1 FROM public.translation_rules r
    WHERE r.archived_at IS NULL
      AND lower(r.pattern) = g.query
  )
  ORDER BY g.frequency DESC, g.avg_confidence ASC
  LIMIT greatest(least(coalesce(max_results, 25), 200), 1);
$function$;

CREATE OR REPLACE FUNCTION public.get_low_confidence_candidates(
  since_date timestamp with time zone DEFAULT (now() - interval '30 days'),
  min_frequency integer DEFAULT 2,
  max_results integer DEFAULT 25,
  max_confidence numeric DEFAULT 0.75
)
RETURNS TABLE(query text, frequency bigint, avg_confidence numeric, last_translation text, zero_results bigint)
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
  RETURN QUERY SELECT * FROM admin_api.get_low_confidence_candidates(
    since_date, min_frequency, max_results, max_confidence
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_low_confidence_candidates(timestamp with time zone, integer, integer, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_low_confidence_candidates(timestamp with time zone, integer, integer, numeric) TO authenticated, service_role;