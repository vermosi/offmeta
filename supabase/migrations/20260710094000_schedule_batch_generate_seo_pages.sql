-- Schedule seed-based SEO page generation for curated starter coverage.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule('batch-generate-seo-pages-weekly')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'batch-generate-seo-pages-weekly'
);

SELECT cron.schedule(
  'batch-generate-seo-pages-weekly',
  '0 5 * * 0',
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/batch-generate-seo-pages',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := '{}'::jsonb
    );
  $$
);
