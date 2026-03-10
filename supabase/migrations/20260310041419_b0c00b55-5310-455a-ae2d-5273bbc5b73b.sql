
-- Drop all RLS policies that depend on has_role(uuid, app_role) first
DROP POLICY IF EXISTS "Admins can read translation logs" ON public.translation_logs;
DROP POLICY IF EXISTS "Admins can read analytics events" ON public.analytics_events;
DROP POLICY IF EXISTS "Admins can read translation rules" ON public.translation_rules;
DROP POLICY IF EXISTS "Admins can update translation rules" ON public.translation_rules;
DROP POLICY IF EXISTS "Admins can read feedback" ON public.search_feedback;
DROP POLICY IF EXISTS "Admins can update feedback" ON public.search_feedback;

-- Drop the old 2-param has_role function
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);

-- Create new 1-param has_role using auth.uid() internally
CREATE OR REPLACE FUNCTION public.has_role(_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = _role
  )
$$;

-- Recreate RLS policies with new signature
CREATE POLICY "Admins can read translation logs"
  ON public.translation_logs FOR SELECT TO authenticated
  USING (public.has_role('admin'::app_role));

CREATE POLICY "Admins can read feedback"
  ON public.search_feedback FOR SELECT TO authenticated
  USING (public.has_role('admin'::app_role));

CREATE POLICY "Admins can update feedback"
  ON public.search_feedback FOR UPDATE TO authenticated
  USING (public.has_role('admin'::app_role))
  WITH CHECK (public.has_role('admin'::app_role));

CREATE POLICY "Admins can read analytics events"
  ON public.analytics_events FOR SELECT TO authenticated
  USING (public.has_role('admin'::app_role));

CREATE POLICY "Admins can read translation rules"
  ON public.translation_rules FOR SELECT TO authenticated
  USING (public.has_role('admin'::app_role));

CREATE POLICY "Admins can update translation rules"
  ON public.translation_rules FOR UPDATE TO authenticated
  USING (public.has_role('admin'::app_role))
  WITH CHECK (public.has_role('admin'::app_role));

-- Update get_search_analytics
CREATE OR REPLACE FUNCTION public.get_search_analytics(since_date timestamp with time zone, max_low_confidence integer DEFAULT 20)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
  ) INTO summary_data FROM translation_logs WHERE created_at >= since_date;

  SELECT COALESCE(jsonb_object_agg(src, cnt), '{}'::jsonb) INTO source_data
  FROM (SELECT COALESCE(source, 'ai') AS src, COUNT(*) AS cnt FROM translation_logs WHERE created_at >= since_date GROUP BY COALESCE(source, 'ai')) s;

  SELECT jsonb_build_object(
    'high', COUNT(*) FILTER (WHERE COALESCE(confidence_score, 0) >= 0.8),
    'medium', COUNT(*) FILTER (WHERE COALESCE(confidence_score, 0) >= 0.6 AND COALESCE(confidence_score, 0) < 0.8),
    'low', COUNT(*) FILTER (WHERE COALESCE(confidence_score, 0) < 0.6)
  ) INTO confidence_data FROM translation_logs WHERE created_at >= since_date;

  SELECT COALESCE(jsonb_object_agg(day, cnt), '{}'::jsonb) INTO daily_data
  FROM (SELECT created_at::date::text AS day, COUNT(*) AS cnt FROM translation_logs WHERE created_at >= since_date GROUP BY created_at::date ORDER BY created_at::date) d;

  SELECT COALESCE(jsonb_object_agg(et, cnt), '{}'::jsonb) INTO event_data
  FROM (SELECT event_type AS et, COUNT(*) AS cnt FROM analytics_events WHERE created_at >= since_date GROUP BY event_type) e;

  SELECT COALESCE(jsonb_agg(row_to_json(lc)), '[]'::jsonb) INTO low_conf_data
  FROM (SELECT natural_language_query AS query, translated_query AS translated, confidence_score AS confidence, source, created_at AS time
    FROM translation_logs WHERE created_at >= since_date AND COALESCE(confidence_score, 0) < 0.6 ORDER BY created_at DESC LIMIT max_low_confidence) lc;

  SELECT COALESCE(jsonb_agg(row_to_json(pq)), '[]'::jsonb) INTO popular_data
  FROM (SELECT LOWER(TRIM(natural_language_query)) AS query, COUNT(*) AS count, ROUND(AVG(COALESCE(confidence_score, 0))::numeric, 2) AS avg_confidence,
    MODE() WITHIN GROUP (ORDER BY COALESCE(source, 'ai')) AS primary_source
    FROM translation_logs WHERE created_at >= since_date GROUP BY LOWER(TRIM(natural_language_query)) ORDER BY COUNT(*) DESC LIMIT 20) pq;

  SELECT jsonb_build_object(
    'p50', COALESCE((SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) FROM translation_logs WHERE created_at >= since_date AND response_time_ms IS NOT NULL)::integer, 0),
    'p95', COALESCE((SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) FROM translation_logs WHERE created_at >= since_date AND response_time_ms IS NOT NULL)::integer, 0),
    'p99', COALESCE((SELECT PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) FROM translation_logs WHERE created_at >= since_date AND response_time_ms IS NOT NULL)::integer, 0)
  ) INTO percentile_data;

  SELECT COALESCE(jsonb_object_agg(day, pct), '{}'::jsonb) INTO coverage_data
  FROM (SELECT created_at::date::text AS day,
    ROUND((COUNT(*) FILTER (WHERE COALESCE(source, 'ai') IN ('deterministic', 'pattern_match'))::numeric / GREATEST(COUNT(*), 1)::numeric) * 100) AS pct
    FROM translation_logs WHERE created_at >= since_date GROUP BY created_at::date ORDER BY created_at::date) dc;

  result := jsonb_build_object(
    'summary', summary_data, 'sourceBreakdown', source_data, 'confidenceBuckets', confidence_data,
    'dailyVolume', daily_data, 'eventBreakdown', event_data, 'lowConfidenceQueries', low_conf_data,
    'popularQueries', popular_data, 'responsePercentiles', percentile_data, 'deterministicCoverage', coverage_data
  );
  RETURN result;
END;
$function$;

-- Update get_system_status
CREATE OR REPLACE FUNCTION public.get_system_status()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb; cron_jobs jsonb; data_freshness jsonb;
BEGIN
  IF NOT public.has_role('admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(j)), '[]'::jsonb) INTO cron_jobs
  FROM (
    SELECT cj.jobid, cj.jobname, cj.schedule, lr.status AS last_status, lr.start_time AS last_run_at, lr.end_time AS last_end_at,
      EXTRACT(EPOCH FROM (lr.end_time - lr.start_time))::numeric(10,2) AS last_duration_s, lr.return_message AS last_message,
      (SELECT count(*) FILTER (WHERE jrd.status = 'failed') FROM cron.job_run_details jrd WHERE jrd.jobid = cj.jobid AND jrd.start_time > now() - interval '24 hours') AS failures_24h,
      (SELECT count(*) FROM cron.job_run_details jrd WHERE jrd.jobid = cj.jobid AND jrd.start_time > now() - interval '24 hours') AS runs_24h
    FROM cron.job cj
    LEFT JOIN LATERAL (SELECT jrd.status, jrd.start_time, jrd.end_time, jrd.return_message FROM cron.job_run_details jrd WHERE jrd.jobid = cj.jobid ORDER BY jrd.start_time DESC LIMIT 1) lr ON true
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
