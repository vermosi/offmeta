-- Nightly light vacuum (runs 20 min after the 03:40 prune job)
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('vacuum-cron-job-run-details','vacuum-full-cron-job-run-details');

SELECT cron.schedule(
  'vacuum-cron-job-run-details',
  '0 4 * * *',
  $$VACUUM (ANALYZE) cron.job_run_details$$
);

-- Weekly full rewrite in a quiet window: reclaims disk space to the OS
SELECT cron.schedule(
  'vacuum-full-cron-job-run-details',
  '10 4 * * 0',
  $$VACUUM (FULL, ANALYZE) cron.job_run_details$$
);
