-- Schedule the cache warmup job so popular query translations stay hot.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule('warmup-cache-weekly')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'warmup-cache-weekly'
);

SELECT cron.schedule(
  'warmup-cache-weekly',
  '0 4 * * 0',
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/warmup-cache',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := '{}'::jsonb
    );
  $$
);
