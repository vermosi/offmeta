-- Schedule the full Scryfall bulk cache sync as a weekly background job.
-- This keeps the local cards table and price snapshots aligned with the
-- latest bulk data without relying on user-triggered requests.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule('bulk-data-sync-weekly')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'bulk-data-sync-weekly'
);

SELECT cron.schedule(
  'bulk-data-sync-weekly',
  '30 4 * * 0',
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/bulk-data-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('page', 1, 'cleanup', true)
    );
  $$
);
