select cron.schedule('adhoc-job-probe', '* * * * *', $$
  select public.trigger_pipeline_job('cleanup-logs', 60000);
  select public.trigger_pipeline_job('warmup-cache', 120000);
  select public.trigger_pipeline_job('generate-patterns', 120000);
$$);