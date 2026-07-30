DO $$
DECLARE j text;
BEGIN
  FOREACH j IN ARRAY ARRAY[
    'check-price-alerts-daily',
    'refresh-archetype-stats-daily',
    'card-printings-sync-weekly'
  ] LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = j) THEN
      PERFORM cron.unschedule(j);
    END IF;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.refresh_archetype_stats();
DROP FUNCTION IF EXISTS public.check_price_alerts();