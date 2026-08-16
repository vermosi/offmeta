DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY['sync-card-names','promote-searches','auto-generate-seo-pages','warmup-cache','cleanup-logs','generate-patterns'] LOOP
    PERFORM net.http_post(
      url := 'https://nxmzyykkzwomkcentctt.supabase.co/functions/v1/' || fn,
      headers := jsonb_build_object('Content-Type','application/json'),
      body := jsonb_build_object('source','manual-verify','pipeline_key',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='OFFMETA_PIPELINE_KEY' LIMIT 1)),
      timeout_milliseconds := 180000
    );
  END LOOP;
END $$;