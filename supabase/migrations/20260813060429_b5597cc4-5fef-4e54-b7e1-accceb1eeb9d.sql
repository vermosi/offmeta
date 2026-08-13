SELECT cron.schedule(
  'ops-watchdog-test',
  '* * * * *',
  $$
    SELECT net.http_post(
      url := 'https://nxmzyykkzwomkcentctt.supabase.co/functions/v1/ops-watchdog',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('triggered_by', 'verify')
    );
  $$
);