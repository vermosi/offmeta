SELECT net.http_post(
  url := 'https://nxmzyykkzwomkcentctt.supabase.co/functions/v1/price-snapshot',
  headers := jsonb_build_object('Content-Type','application/json'),
  body := jsonb_build_object('offset', 0, 'pipeline_key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'OFFMETA_PIPELINE_KEY' LIMIT 1)),
  timeout_milliseconds := 120000
) AS request_id;