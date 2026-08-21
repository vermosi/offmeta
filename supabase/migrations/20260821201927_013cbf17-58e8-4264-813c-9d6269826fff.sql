-- Batched prune of cron.job_run_details, walking oldest runids first.
CREATE OR REPLACE FUNCTION public.prune_cron_job_run_details(
  _retention_days integer DEFAULT 7,
  _max_batches integer DEFAULT 200
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  cutoff timestamptz := now() - make_interval(days => _retention_days);
  deleted_total integer := 0;
  deleted_batch integer;
  i integer := 0;
BEGIN
  PERFORM set_config('statement_timeout', '0', true);
  LOOP
    i := i + 1;
    EXIT WHEN i > _max_batches;

    DELETE FROM cron.job_run_details
    WHERE runid IN (
      SELECT runid
      FROM cron.job_run_details
      WHERE start_time < cutoff
      ORDER BY runid
      LIMIT 20000
    );
    GET DIAGNOSTICS deleted_batch = ROW_COUNT;
    deleted_total := deleted_total + deleted_batch;
    EXIT WHEN deleted_batch = 0;
  END LOOP;
  RETURN deleted_total;
END;
$$;

REVOKE ALL ON FUNCTION public.prune_cron_job_run_details(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prune_cron_job_run_details(integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_cron_job_run_details(integer, integer) TO service_role;

-- Daily retention job
SELECT cron.unschedule('prune-cron-job-run-details')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prune-cron-job-run-details');

SELECT cron.schedule(
  'prune-cron-job-run-details',
  '40 3 * * *',
  $$SELECT public.prune_cron_job_run_details(7);$$
);

-- Temporary catch-up job for the existing backlog; unschedules itself when done.
SELECT cron.unschedule('prune-cron-job-run-details-backfill')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prune-cron-job-run-details-backfill');

SELECT cron.schedule(
  'prune-cron-job-run-details-backfill',
  '*/15 * * * *',
  $$
  SELECT CASE
    WHEN public.prune_cron_job_run_details(7, 100) = 0
      THEN (SELECT cron.unschedule('prune-cron-job-run-details-backfill')::text)
    ELSE 'more'
  END;
  $$
);