SELECT cron.unschedule('ops-watchdog-test');
SELECT cron.unschedule('ops-watchdog-hourly');

SELECT cron.schedule(
  'ops-watchdog-hourly',
  '15 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://nxmzyykkzwomkcentctt.supabase.co/functions/v1/ops-watchdog',
      headers := jsonb_build_object('Content-Type','application/json'),
      body := jsonb_build_object(
        'triggered_by', 'pg_cron',
        'pipeline_key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'OFFMETA_PIPELINE_KEY' LIMIT 1)
      ),
      timeout_milliseconds := 120000
    ) AS request_id;
  $$
);