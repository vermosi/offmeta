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
  IF NOT public.is_service_role_request() AND NOT public.has_role('admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;

  -- cron.job_run_details holds ~1.8M rows, has only a runid PK, and is owned by
  -- the extension (we cannot index or prune it). A full scan takes ~55s, so read
  -- just the newest slice through the PK index (runid is monotonic) — that covers
  -- far more than the 24h window and every job's latest run.
  WITH recent AS (
    SELECT jobid, status, start_time, end_time, return_message
    FROM cron.job_run_details
    ORDER BY runid DESC
    LIMIT 20000
  ),
  agg AS (
    SELECT jobid,
           count(*) FILTER (WHERE start_time > now() - interval '24 hours') AS runs_24h,
           count(*) FILTER (WHERE start_time > now() - interval '24 hours' AND status = 'failed') AS failures_24h
    FROM recent GROUP BY jobid
  ),
  latest AS (
    SELECT DISTINCT ON (jobid) jobid, status, start_time, end_time, return_message
    FROM recent ORDER BY jobid, start_time DESC
  )
  SELECT COALESCE(jsonb_agg(row_to_json(j) ORDER BY j.jobname), '[]'::jsonb) INTO cron_jobs
  FROM (
    SELECT cj.jobid, cj.jobname, cj.schedule,
      l.status AS last_status,
      l.start_time AS last_run_at,
      l.end_time AS last_end_at,
      EXTRACT(EPOCH FROM (l.end_time - l.start_time))::numeric(10,2) AS last_duration_s,
      l.return_message AS last_message,
      COALESCE(a.failures_24h, 0) AS failures_24h,
      COALESCE(a.runs_24h, 0) AS runs_24h
    FROM cron.job cj
    LEFT JOIN latest l ON l.jobid = cj.jobid
    LEFT JOIN agg a ON a.jobid = cj.jobid
  ) j;

  SELECT jsonb_build_object(
    'cards', jsonb_build_object(
      'count', admin_api.table_row_estimate('public.cards'),
      'latest', (SELECT max(updated_at) FROM public.cards)),
    'card_cooccurrence', jsonb_build_object(
      'count', admin_api.table_row_estimate('public.card_cooccurrence')),
    'translation_logs', jsonb_build_object(
      'count', admin_api.table_row_estimate('public.translation_logs'),
      'latest', (SELECT max(created_at) FROM public.translation_logs)),
    'query_cache', jsonb_build_object(
      'count', admin_api.table_row_estimate('public.query_cache'),
      'latest', (SELECT max(created_at) FROM public.query_cache)),
    'price_snapshots', jsonb_build_object(
      'count', admin_api.table_row_estimate('public.price_snapshots'),
      'latest', (SELECT max(recorded_at) FROM public.price_snapshots)),
    'translation_rules', (
      SELECT jsonb_build_object('count', count(*), 'active', count(*) FILTER (WHERE is_active))
      FROM public.translation_rules),
    'search_feedback', (
      SELECT jsonb_build_object('count', count(*), 'pending', count(*) FILTER (WHERE processing_status = 'pending' OR processing_status IS NULL))
      FROM public.search_feedback)
  ) INTO data_freshness;

  result := jsonb_build_object('cronJobs', cron_jobs, 'dataFreshness', data_freshness, 'serverTime', now());
  RETURN result;
END;
$function$;