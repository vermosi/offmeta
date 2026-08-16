SELECT net.http_post(
  url := 'https://nxmzyykkzwomkcentctt.supabase.co/functions/v1/discord-bot?register=1',
  headers := jsonb_build_object(
    'Content-Type','application/json',
    'x-offmeta-key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'OFFMETA_PIPELINE_KEY' LIMIT 1)
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 30000
) AS request_id;