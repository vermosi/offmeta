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