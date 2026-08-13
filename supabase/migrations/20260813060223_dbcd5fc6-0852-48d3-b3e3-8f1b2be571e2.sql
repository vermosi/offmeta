CREATE TABLE IF NOT EXISTS public.ops_watchdog_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  problems integer NOT NULL DEFAULT 0,
  remediations integer NOT NULL DEFAULT 0,
  checks jsonb NOT NULL DEFAULT '[]'::jsonb
);

GRANT ALL ON public.ops_watchdog_runs TO service_role;
ALTER TABLE public.ops_watchdog_runs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS ops_watchdog_runs_started_idx
  ON public.ops_watchdog_runs (started_at DESC);

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
  SELECT j.jobname::text,
         j.jobid,
         count(*) AS failures,
         max(d.start_time) AS last_run,
         (array_agg(d.return_message ORDER BY d.start_time DESC))[1]::text AS last_message
  FROM cron.job_run_details d
  JOIN cron.job j ON j.jobid = d.jobid
  WHERE d.status = 'failed'
    AND d.start_time > now() - make_interval(hours => greatest(p_hours, 1))
  GROUP BY j.jobname, j.jobid
$$;

REVOKE ALL ON FUNCTION public.get_recent_cron_failures(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_cron_failures(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.get_ops_freshness()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'price_snapshot_last_at', (SELECT max(recorded_at) FROM public.price_snapshots),
    'self_heal_last_success_at', (SELECT max(finished_at) FROM public.self_heal_runs WHERE status = 'completed'),
    'open_error_events', (SELECT count(*) FROM public.error_events WHERE status = 'open'),
    'stuck_error_events', (SELECT count(*) FROM public.error_events WHERE status = 'open' AND fix_attempts >= 3),
    'sitemap_last_submitted_at', (SELECT max(submitted_at) FROM public.sitemap_submissions)
  )
$$;

REVOKE ALL ON FUNCTION public.get_ops_freshness() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_ops_freshness() TO service_role;