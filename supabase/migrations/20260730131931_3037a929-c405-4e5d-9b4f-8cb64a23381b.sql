DO $$
DECLARE j text;
BEGIN
  FOREACH j IN ARRAY ARRAY[
    'card-sync-daily',
    'compute-cooccurrence-daily',
    'detect-archetypes-daily',
    'topdeck-import-daily',
    'topdeck-import-weekly',
    'mtgjson-import-weekly'
  ] LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = j) THEN
      PERFORM cron.unschedule(j);
    END IF;
  END LOOP;
END $$;

SELECT cron.schedule(
  'mtgjson-import-weekly',
  '15 5 * * 0',
  $cmd$
    SELECT
      net.http_post(
        url := current_setting('app.settings.supabase_url', true) || '/functions/v1/mtgjson-price-history-sync',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object('scan', true, 'days', 7, 'batchSize', 50, 'offset', 0)
      );
  $cmd$
);
