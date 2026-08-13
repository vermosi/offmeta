SELECT cron.unschedule('ops-watchdog-hourly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ops-watchdog-hourly');

SELECT cron.schedule(
  'ops-watchdog-hourly',
  '15 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://nxmzyykkzwomkcentctt.supabase.co/functions/v1/ops-watchdog',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('triggered_by', 'pg_cron')
    );
  $$
);