CREATE OR REPLACE FUNCTION public.get_recent_cron_failures(p_hours integer DEFAULT 24)
RETURNS TABLE (
  jobname text,
  jobid bigint,
  failures bigint,
  last_run timestamptz,
  last_message text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, cron
AS $$
  WITH recent AS (
    SELECT d.jobid, d.status, d.start_time, d.return_message
    FROM cron.job_run_details d
    ORDER BY d.runid DESC
    LIMIT 5000
  )
  SELECT j.jobname::text,
         j.jobid,
         count(*) AS failures,
         max(r.start_time) AS last_run,
         (array_agg(r.return_message ORDER BY r.start_time DESC))[1]::text AS last_message
  FROM recent r
  JOIN cron.job j ON j.jobid = r.jobid
  WHERE r.status = 'failed'
    AND r.start_time > now() - make_interval(hours => greatest(p_hours, 1))
  GROUP BY j.jobname, j.jobid
$$;

REVOKE ALL ON FUNCTION public.get_recent_cron_failures(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_cron_failures(integer) TO service_role;

SELECT cron.unschedule('ops-watchdog-test');