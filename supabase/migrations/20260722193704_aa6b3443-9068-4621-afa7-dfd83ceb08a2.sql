DO $$
DECLARE
  anon_key constant text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bXp5eWtrendvbWtjZW50Y3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMzgwOTYsImV4cCI6MjA4MDgxNDA5Nn0.sJbaqJuvKqIMYV0D2Q4iWgTRlzVGih7OXRRkGmDsGPY';
BEGIN
  PERFORM cron.unschedule('daily-price-snapshot');
  PERFORM cron.schedule('daily-price-snapshot', '0 6 * * *', format($cmd$
    SELECT net.http_post(
      url := 'https://nxmzyykkzwomkcentctt.supabase.co/functions/v1/price-snapshot',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s'),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    ) AS request_id;
  $cmd$, anon_key));

  PERFORM cron.unschedule('card-sync-daily');
  PERFORM cron.schedule('card-sync-daily', '0 7 * * *', format($cmd$
    SELECT net.http_post(
      url := 'https://nxmzyykkzwomkcentctt.supabase.co/functions/v1/card-sync',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s','apikey','%s'),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    ) AS request_id;
  $cmd$, anon_key, anon_key));

  PERFORM cron.unschedule('compute-cooccurrence-daily');
  PERFORM cron.schedule('compute-cooccurrence-daily', '0 8 * * *', $cmd$
    SELECT net.http_post(
      url := 'https://nxmzyykkzwomkcentctt.supabase.co/functions/v1/compute-cooccurrence',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1)
      ),
      body := '{"format":"all"}'::jsonb,
      timeout_milliseconds := 120000
    ) AS request_id;
  $cmd$);

  PERFORM cron.unschedule('detect-archetypes-daily');
  PERFORM cron.schedule('detect-archetypes-daily', '0 8 * * *', format($cmd$
    SELECT net.http_post(
      url := 'https://nxmzyykkzwomkcentctt.supabase.co/functions/v1/detect-archetypes',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s'),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    ) AS request_id;
  $cmd$, anon_key));

  PERFORM cron.unschedule('seo-health-check-daily');
  PERFORM cron.schedule('seo-health-check-daily', '0 9 * * *', $cmd$
    SELECT net.http_post(
      url := 'https://nxmzyykkzwomkcentctt.supabase.co/functions/v1/seo-health-check',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-pipeline-key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'OFFMETA_PIPELINE_KEY' LIMIT 1)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    ) AS request_id;
  $cmd$);
END $$;