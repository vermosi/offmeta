DO $$
DECLARE
  fn text;
  jobs jsonb := '[
    {"job":"sync-card-names-weekly","fn":"sync-card-names","sched":"0 5 * * 0","t":180000},
    {"job":"promote-popular-searches","fn":"promote-searches","sched":"0 5 * * 0","t":120000},
    {"job":"auto-generate-seo-pages-weekly","fn":"auto-generate-seo-pages","sched":"0 6 * * 0","t":180000},
    {"job":"daily-cache-warmup","fn":"warmup-cache","sched":"0 0 * * *","t":120000},
    {"job":"cleanup-logs-nightly","fn":"cleanup-logs","sched":"0 2 * * *","t":120000},
    {"job":"generate-patterns-nightly","fn":"generate-patterns","sched":"0 3 * * *","t":180000}
  ]'::jsonb;
  j jsonb;
BEGIN
  FOR j IN SELECT * FROM jsonb_array_elements(jobs) LOOP
    PERFORM cron.schedule(
      j->>'job',
      j->>'sched',
      format($cmd$
    SELECT net.http_post(
      url := 'https://nxmzyykkzwomkcentctt.supabase.co/functions/v1/%s',
      headers := jsonb_build_object('Content-Type','application/json'),
      body := jsonb_build_object(
        'source', 'cron',
        'pipeline_key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'OFFMETA_PIPELINE_KEY' LIMIT 1)
      ),
      timeout_milliseconds := %s
    ) AS request_id;
  $cmd$, j->>'fn', j->>'t')
    );
  END LOOP;
END $$;