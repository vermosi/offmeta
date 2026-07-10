-- Schedule SEO page generation from popular queries.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule('auto-generate-seo-pages-weekly')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-generate-seo-pages-weekly'
);

SELECT cron.schedule(
  'auto-generate-seo-pages-weekly',
  '30 4 * * 0',
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/auto-generate-seo-pages',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := '{}'::jsonb
    );
  $$
);
