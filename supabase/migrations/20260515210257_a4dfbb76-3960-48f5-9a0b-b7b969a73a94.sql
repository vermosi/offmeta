-- 1. Private schema for admin-only RPCs (not exposed to PostgREST)
CREATE SCHEMA IF NOT EXISTS admin_api;

-- Lock down schema usage: only the service role may enter the schema.
REVOKE ALL ON SCHEMA admin_api FROM PUBLIC;
REVOKE ALL ON SCHEMA admin_api FROM anon, authenticated;
GRANT USAGE ON SCHEMA admin_api TO service_role;

-- Default privileges for any future objects created in admin_api
ALTER DEFAULT PRIVILEGES IN SCHEMA admin_api
  REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA admin_api
  GRANT EXECUTE ON FUNCTIONS TO service_role;

-- 2. Recreate each admin RPC in admin_api. We keep the internal
--    public.has_role('admin') guard as defense-in-depth even though the
--    edge function already enforces this — cheap insurance against any
--    future caller that obtains the service role key.

------------------------------------------------------------
-- get_system_status
------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_api.get_system_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '15s'
AS $function$
DECLARE
  result jsonb; cron_jobs jsonb; data_freshness jsonb;
BEGIN
  IF NOT public.has_role('admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(j)), '[]'::jsonb) INTO cron_jobs
  FROM (
    SELECT cj.jobid, cj.jobname, cj.schedule, lr.status AS last_status,
      lr.start_time AS last_run_at, lr.end_time AS last_end_at,
      EXTRACT(EPOCH FROM (lr.end_time - lr.start_time))::numeric(10,2) AS last_duration_s,
      lr.return_message AS last_message,
      COALESCE(fc.fail_count, 0) AS failures_24h,
      COALESCE(rc.run_count, 0) AS runs_24h
    FROM cron.job cj
    LEFT JOIN LATERAL (
      SELECT jrd.status, jrd.start_time, jrd.end_time, jrd.return_message
      FROM cron.job_run_details jrd
      WHERE jrd.jobid = cj.jobid
      ORDER BY jrd.start_time DESC LIMIT 1
    ) lr ON true
    LEFT JOIN LATERAL (
      SELECT count(*) AS fail_count
      FROM cron.job_run_details jrd
      WHERE jrd.jobid = cj.jobid AND jrd.start_time > now() - interval '24 hours' AND jrd.status = 'failed'
    ) fc ON true
    LEFT JOIN LATERAL (
      SELECT count(*) AS run_count
      FROM cron.job_run_details jrd
      WHERE jrd.jobid = cj.jobid AND jrd.start_time > now() - interval '24 hours'
    ) rc ON true
    ORDER BY cj.jobname
  ) j;

  SELECT jsonb_build_object(
    'community_decks', (SELECT jsonb_build_object('count', count(*), 'latest', max(created_at)) FROM public.community_decks),
    'cards', (SELECT jsonb_build_object('count', count(*), 'latest', max(updated_at)) FROM public.cards),
    'card_cooccurrence', (SELECT jsonb_build_object('count', count(*)) FROM public.card_cooccurrence),
    'translation_logs', (SELECT jsonb_build_object('count', count(*), 'latest', max(created_at)) FROM public.translation_logs),
    'query_cache', (SELECT jsonb_build_object('count', count(*), 'latest', max(created_at)) FROM public.query_cache),
    'price_snapshots', (SELECT jsonb_build_object('count', count(*), 'latest', max(recorded_at)) FROM public.price_snapshots),
    'translation_rules', (SELECT jsonb_build_object('count', count(*), 'active', count(*) FILTER (WHERE is_active)) FROM public.translation_rules),
    'search_feedback', (SELECT jsonb_build_object('count', count(*), 'pending', count(*) FILTER (WHERE processing_status = 'pending' OR processing_status IS NULL)) FROM public.search_feedback)
  ) INTO data_freshness;

  result := jsonb_build_object('cronJobs', cron_jobs, 'dataFreshness', data_freshness, 'serverTime', now());
  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION admin_api.get_system_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_api.get_system_status() TO service_role;

------------------------------------------------------------
-- get_ai_usage_stats
------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_api.get_ai_usage_stats(days_back integer DEFAULT 30)
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

  WITH by_model AS (
    SELECT model, count(*) AS request_count, sum(prompt_tokens) AS prompt_tokens,
      sum(completion_tokens) AS completion_tokens, sum(total_tokens) AS total_tokens,
      round(avg(duration_ms)) AS avg_duration_ms, sum(retries) AS total_retries
    FROM ai_usage_logs WHERE created_at >= since_ts
    GROUP BY model ORDER BY sum(total_tokens) DESC
  ),
  by_function AS (
    SELECT function_name, count(*) AS request_count, sum(total_tokens) AS total_tokens,
      round(avg(duration_ms)) AS avg_duration_ms
    FROM ai_usage_logs WHERE created_at >= since_ts
    GROUP BY function_name ORDER BY sum(total_tokens) DESC
  ),
  daily AS (
    SELECT created_at::date::text AS day, sum(total_tokens) AS tokens, count(*) AS requests
    FROM ai_usage_logs WHERE created_at >= since_ts
    GROUP BY created_at::date ORDER BY created_at::date
  ),
  totals AS (
    SELECT count(*) AS total_requests, coalesce(sum(total_tokens), 0) AS total_tokens,
      coalesce(sum(prompt_tokens), 0) AS total_prompt_tokens,
      coalesce(sum(completion_tokens), 0) AS total_completion_tokens,
      round(coalesce(avg(duration_ms), 0)) AS avg_duration_ms,
      coalesce(sum(retries), 0) AS total_retries
    FROM ai_usage_logs WHERE created_at >= since_ts
  )
  SELECT jsonb_build_object(
    'summary', (SELECT row_to_json(t) FROM totals t),
    'byModel', coalesce((SELECT jsonb_agg(row_to_json(m)) FROM by_model m), '[]'::jsonb),
    'byFunction', coalesce((SELECT jsonb_agg(row_to_json(f)) FROM by_function f), '[]'::jsonb),
    'daily', coalesce((SELECT jsonb_agg(row_to_json(d)) FROM daily d), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION admin_api.get_ai_usage_stats(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_api.get_ai_usage_stats(integer) TO service_role;

------------------------------------------------------------
-- get_conversion_funnel
------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_api.get_conversion_funnel(days_back integer DEFAULT 90)
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
    SELECT COALESCE(session_id, 'unknown') AS sid, array_agg(DISTINCT event_type) AS types
    FROM analytics_events
    WHERE created_at >= since_ts
      AND event_type IN ('search', 'card_click', 'card_modal_view', 'affiliate_click')
      AND COALESCE(event_data->>'is_internal', 'false') <> 'true'
    GROUP BY COALESCE(session_id, 'unknown')
  ),
  event_totals AS (
    SELECT event_type, count(*) AS cnt FROM analytics_events
    WHERE created_at >= since_ts
      AND event_type IN ('search', 'card_click', 'card_modal_view', 'affiliate_click')
      AND COALESCE(event_data->>'is_internal', 'false') <> 'true'
    GROUP BY event_type
  ),
  sequential AS (
    SELECT count(*) AS total_sessions,
      count(*) FILTER (WHERE 'search' = ANY(types)) AS searched_sessions,
      count(*) FILTER (WHERE 'search' = ANY(types) AND ('card_click' = ANY(types) OR 'card_modal_view' = ANY(types))) AS clicked_sessions,
      count(*) FILTER (WHERE 'search' = ANY(types) AND ('card_click' = ANY(types) OR 'card_modal_view' = ANY(types)) AND 'affiliate_click' = ANY(types)) AS affiliate_sessions
    FROM session_events
  ),
  independent AS (
    SELECT count(*) AS total_sessions,
      count(*) FILTER (WHERE 'search' = ANY(types)) AS searched_sessions,
      count(*) FILTER (WHERE 'card_click' = ANY(types) OR 'card_modal_view' = ANY(types)) AS clicked_sessions,
      count(*) FILTER (WHERE 'affiliate_click' = ANY(types)) AS affiliate_sessions
    FROM session_events
  ),
  utm_data AS (
    SELECT event_data->>'utm_source' AS source, COALESCE(session_id, 'unknown') AS sid, event_type
    FROM analytics_events
    WHERE created_at >= since_ts
      AND event_type IN ('search', 'card_click', 'card_modal_view', 'affiliate_click')
      AND event_data->>'utm_source' IS NOT NULL
      AND COALESCE(event_data->>'is_internal', 'false') <> 'true'
  ),
  utm_agg AS (
    SELECT source, count(DISTINCT sid) AS sessions,
      count(DISTINCT sid) FILTER (WHERE event_type = 'search') AS searches,
      count(DISTINCT sid) FILTER (WHERE event_type IN ('card_click', 'card_modal_view')) AS clicks,
      count(DISTINCT sid) FILTER (WHERE event_type = 'affiliate_click') AS affiliates
    FROM utm_data
    GROUP BY source ORDER BY count(DISTINCT sid) DESC LIMIT 10
  )
  SELECT jsonb_build_object(
    'sequential', (SELECT jsonb_build_object('totalSessions', s.total_sessions, 'searchedSessions', s.searched_sessions, 'clickedSessions', s.clicked_sessions, 'affiliateSessions', s.affiliate_sessions) FROM sequential s),
    'independent', (SELECT jsonb_build_object('totalSessions', i.total_sessions, 'searchedSessions', i.searched_sessions, 'clickedSessions', i.clicked_sessions, 'affiliateSessions', i.affiliate_sessions) FROM independent i),
    'eventTotals', (SELECT jsonb_object_agg(event_type, cnt) FROM event_totals),
    'utmSources', COALESCE((SELECT jsonb_agg(row_to_json(u)) FROM utm_agg u), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION admin_api.get_conversion_funnel(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_api.get_conversion_funnel(integer) TO service_role;

------------------------------------------------------------
-- get_search_analytics
------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_api.get_search_analytics(since_date timestamp with time zone, max_low_confidence integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  result jsonb; summary_data jsonb; source_data jsonb; confidence_data jsonb;
  daily_data jsonb; evt_data jsonb; low_conf_data jsonb; popular_data jsonb;
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
    WHERE created_at >= since_date AND LOWER(TRIM(natural_language_query)) NOT IN ('ping warmup', 'warmup')
    GROUP BY COALESCE(source, 'ai')) s;

  SELECT jsonb_build_object(
    'high', COUNT(*) FILTER (WHERE COALESCE(confidence_score, 0) >= 0.8),
    'medium', COUNT(*) FILTER (WHERE COALESCE(confidence_score, 0) >= 0.6 AND COALESCE(confidence_score, 0) < 0.8),
    'low', COUNT(*) FILTER (WHERE COALESCE(confidence_score, 0) < 0.6)
  ) INTO confidence_data FROM translation_logs
  WHERE created_at >= since_date AND LOWER(TRIM(natural_language_query)) NOT IN ('ping warmup', 'warmup');

  SELECT COALESCE(jsonb_object_agg(day, cnt), '{}'::jsonb) INTO daily_data
  FROM (SELECT created_at::date::text AS day, COUNT(*) AS cnt FROM translation_logs
    WHERE created_at >= since_date AND LOWER(TRIM(natural_language_query)) NOT IN ('ping warmup', 'warmup')
    GROUP BY created_at::date ORDER BY created_at::date) d;

  SELECT COALESCE(jsonb_object_agg(et, cnt), '{}'::jsonb) INTO evt_data
  FROM (SELECT ae.event_type AS et, COUNT(*) AS cnt FROM analytics_events ae
    WHERE ae.created_at >= since_date AND COALESCE(ae.event_data->>'is_internal', 'false') <> 'true'
    GROUP BY ae.event_type) e;

  SELECT COALESCE(jsonb_agg(row_to_json(lc)), '[]'::jsonb) INTO low_conf_data
  FROM (SELECT natural_language_query AS query, translated_query AS translated, confidence_score AS confidence, source, created_at AS time
    FROM translation_logs
    WHERE created_at >= since_date AND COALESCE(confidence_score, 0) < 0.6
      AND LOWER(TRIM(natural_language_query)) NOT IN ('ping warmup', 'warmup')
    ORDER BY created_at DESC LIMIT max_low_confidence) lc;

  SELECT COALESCE(jsonb_agg(row_to_json(pq)), '[]'::jsonb) INTO popular_data
  FROM (SELECT LOWER(TRIM(natural_language_query)) AS query, COUNT(*) AS count,
    ROUND(AVG(COALESCE(confidence_score, 0))::numeric, 2) AS avg_confidence,
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
    WHERE created_at >= since_date AND LOWER(TRIM(natural_language_query)) NOT IN ('ping warmup', 'warmup')
    GROUP BY created_at::date ORDER BY created_at::date) dc;

  result := jsonb_build_object(
    'summary', summary_data, 'sourceBreakdown', source_data, 'confidenceBuckets', confidence_data,
    'dailyVolume', daily_data, 'eventBreakdown', evt_data, 'lowConfidenceQueries', low_conf_data,
    'popularQueries', popular_data, 'responsePercentiles', percentile_data, 'deterministicCoverage', coverage_data
  );
  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION admin_api.get_search_analytics(timestamp with time zone, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_api.get_search_analytics(timestamp with time zone, integer) TO service_role;

-- 3. Drop the public copies — they're no longer reachable from PostgREST.
DROP FUNCTION IF EXISTS public.get_system_status();
DROP FUNCTION IF EXISTS public.get_ai_usage_stats(integer);
DROP FUNCTION IF EXISTS public.get_conversion_funnel(integer);
DROP FUNCTION IF EXISTS public.get_search_analytics(timestamp with time zone, integer);