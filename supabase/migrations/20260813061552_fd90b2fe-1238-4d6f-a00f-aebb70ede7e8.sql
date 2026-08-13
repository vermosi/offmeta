SELECT cron.schedule('price-snapshot-test', '* * * * *', $$
  select net.http_post(
    url := 'https://nxmzyykkzwomkcentctt.supabase.co/functions/v1/price-snapshot',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object('pipeline_key', (select decrypted_secret from vault.decrypted_secrets where name='OFFMETA_PIPELINE_KEY' limit 1), 'triggered_by','watchdog-verify')
  );
$$);