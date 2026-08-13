DO $$
BEGIN
  BEGIN PERFORM cron.unschedule('fix-zero-results-daily'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('self-heal-search-6h'); EXCEPTION WHEN OTHERS THEN NULL; END;

  PERFORM cron.schedule('self-heal-search-6h', '35 */6 * * *', $cmd$
    SELECT net.http_post(
      url := 'https://nxmzyykkzwomkcentctt.supabase.co/functions/v1/self-heal-search',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-pipeline-key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'OFFMETA_PIPELINE_KEY' LIMIT 1)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 180000
    ) AS request_id;
  $cmd$);
END $$;