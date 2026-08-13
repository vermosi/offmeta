DO $$
BEGIN
  BEGIN PERFORM cron.unschedule('self-heal-oneshot'); EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;