CREATE OR REPLACE FUNCTION public.get_system_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  cron_jobs jsonb;
  data_freshness jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(j)), '[]'::jsonb) INTO cron_jobs
  FROM (
    SELECT
      cj.jobid,
      cj.jobname,
      cj.schedule,
      lr.status AS last_status,
      lr.start_time AS last_run_at,
      lr.end_time AS last_end_at,
      EXTRACT(EPOCH FROM (lr.end_time - lr.start_time))::numeric(10,2) AS last_duration_s,
      lr.return_message AS last_message,
      (
        SELECT count(*) FILTER (WHERE jrd.status = 'failed')
        FROM cron.job_run_details jrd
        WHERE jrd.jobid = cj.jobid
          AND jrd.start_time > now() - interval '24 hours'
      ) AS failures_24h,
      (
        SELECT count(*)
        FROM cron.job_run_details jrd
        WHERE jrd.jobid = cj.jobid
          AND jrd.start_time > now() - interval '24 hours'
      ) AS runs_24h
    FROM cron.job cj
    LEFT JOIN LATERAL (
      SELECT jrd.status, jrd.start_time, jrd.end_time, jrd.return_message
      FROM cron.job_run_details jrd
      WHERE jrd.jobid = cj.jobid
      ORDER BY jrd.start_time DESC
      LIMIT 1
    ) lr ON true
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

  result := jsonb_build_object(
    'cronJobs', cron_jobs,
    'dataFreshness', data_freshness,
    'serverTime', now()
  );

  RETURN result;
END;
$$;