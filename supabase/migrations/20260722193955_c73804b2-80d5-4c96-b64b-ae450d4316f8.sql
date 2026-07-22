-- Store the rotated pipeline key in the vault
SELECT vault.create_secret(
  '4Uv2eNGiBHJ7aHjRwELEjO02CShL-uSpHbyHfCMGYu9Ceey6MBJBybFsq6ZiEP1K',
  'OFFMETA_PIPELINE_KEY',
  'Shared secret for cron-invoked edge functions (price-snapshot, card-sync, compute-cooccurrence, detect-archetypes, seo-health-check, fix-zero-results). Mirrors the OFFMETA_PIPELINE_KEY edge function env var.'
);

DO $$
BEGIN
  -- price-snapshot
  BEGIN PERFORM cron.unschedule('daily-price-snapshot'); EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM cron.schedule('daily-price-snapshot', '0 6 * * *', $cmd$
    SELECT net.http_post(
      url := 'https://nxmzyykkzwomkcentctt.supabase.co/functions/v1/price-snapshot',
      headers := jsonb_build_object('Content-Type','application/json'),
      body := jsonb_build_object('pipeline_key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'OFFMETA_PIPELINE_KEY' LIMIT 1)),
      timeout_milliseconds := 60000
    ) AS request_id;
  $cmd$);

  -- card-sync
  BEGIN PERFORM cron.unschedule('card-sync-daily'); EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM cron.schedule('card-sync-daily', '0 7 * * *', $cmd$
    SELECT net.http_post(
      url := 'https://nxmzyykkzwomkcentctt.supabase.co/functions/v1/card-sync',
      headers := jsonb_build_object('Content-Type','application/json'),
      body := jsonb_build_object('pipeline_key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'OFFMETA_PIPELINE_KEY' LIMIT 1)),
      timeout_milliseconds := 120000
    ) AS request_id;
  $cmd$);

  -- compute-cooccurrence
  BEGIN PERFORM cron.unschedule('compute-cooccurrence-daily'); EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM cron.schedule('compute-cooccurrence-daily', '0 8 * * *', $cmd$
    SELECT net.http_post(
      url := 'https://nxmzyykkzwomkcentctt.supabase.co/functions/v1/compute-cooccurrence',
      headers := jsonb_build_object('Content-Type','application/json'),
      body := jsonb_build_object(
        'pipeline_key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'OFFMETA_PIPELINE_KEY' LIMIT 1),
        'format', 'all'
      ),
      timeout_milliseconds := 120000
    ) AS request_id;
  $cmd$);

  -- detect-archetypes
  BEGIN PERFORM cron.unschedule('detect-archetypes-daily'); EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM cron.schedule('detect-archetypes-daily', '30 8 * * *', $cmd$
    SELECT net.http_post(
      url := 'https://nxmzyykkzwomkcentctt.supabase.co/functions/v1/detect-archetypes',
      headers := jsonb_build_object('Content-Type','application/json'),
      body := jsonb_build_object('pipeline_key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'OFFMETA_PIPELINE_KEY' LIMIT 1)),
      timeout_milliseconds := 120000
    ) AS request_id;
  $cmd$);

  -- seo-health-check (uses x-pipeline-key header)
  BEGIN PERFORM cron.unschedule('seo-health-check-daily'); EXCEPTION WHEN OTHERS THEN NULL; END;
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

  -- fix-zero-results
  BEGIN PERFORM cron.unschedule('fix-zero-results-daily'); EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM cron.schedule('fix-zero-results-daily', '15 9 * * *', $cmd$
    SELECT net.http_post(
      url := 'https://nxmzyykkzwomkcentctt.supabase.co/functions/v1/fix-zero-results',
      headers := jsonb_build_object('Content-Type','application/json'),
      body := jsonb_build_object('pipeline_key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'OFFMETA_PIPELINE_KEY' LIMIT 1)),
      timeout_milliseconds := 60000
    ) AS request_id;
  $cmd$);
END $$;