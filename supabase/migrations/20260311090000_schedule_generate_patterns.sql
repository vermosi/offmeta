-- Schedule generate-patterns edge function to run every 24 hours.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule('generate-patterns-daily')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'generate-patterns-daily'
);

SELECT cron.schedule(
  'generate-patterns-daily',
  '0 3 * * *',
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/generate-patterns',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := '{}'::jsonb
    );
  $$
);
