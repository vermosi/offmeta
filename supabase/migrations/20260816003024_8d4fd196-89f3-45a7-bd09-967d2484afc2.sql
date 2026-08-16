select cron.alter_job(
  27,
  command := $job$
    SELECT net.http_post(
      url := 'https://nxmzyykkzwomkcentctt.supabase.co/functions/v1/bulk-data-sync',
      headers := jsonb_build_object('Content-Type','application/json'),
      body := jsonb_build_object(
        'page', 1,
        'source', 'cron',
        'pipeline_key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'OFFMETA_PIPELINE_KEY' LIMIT 1)
      ),
      timeout_milliseconds := 120000
    ) AS request_id;
  $job$
);

select cron.alter_job(
  68,
  command := $job$
    SELECT net.http_post(
      url := 'https://nxmzyykkzwomkcentctt.supabase.co/functions/v1/error-auto-fix',
      headers := jsonb_build_object('Content-Type','application/json'),
      body := jsonb_build_object(
        'reason', 'cron',
        'pipeline_key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'OFFMETA_PIPELINE_KEY' LIMIT 1)
      ),
      timeout_milliseconds := 60000
    ) AS request_id;
  $job$
);