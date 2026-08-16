DO $$
DECLARE
  j jsonb;
  anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bXp5eWtrendvbWtjZW50Y3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMzgwOTYsImV4cCI6MjA4MDgxNDA5Nn0.sJbaqJuvKqIMYV0D2Q4iWgTRlzVGih7OXRRkGmDsGPY';
  jobs jsonb := '[
    {"job":"auto-generate-seo-pages-weekly","fn":"auto-generate-seo-pages","sched":"0 6 * * 0","t":180000},
    {"job":"daily-cache-warmup","fn":"warmup-cache","sched":"0 0 * * *","t":120000},
    {"job":"cleanup-logs-nightly","fn":"cleanup-logs","sched":"0 2 * * *","t":120000},
    {"job":"generate-patterns-nightly","fn":"generate-patterns","sched":"0 3 * * *","t":180000}
  ]'::jsonb;
BEGIN
  FOR j IN SELECT * FROM jsonb_array_elements(jobs) LOOP
    PERFORM cron.schedule(
      j->>'job',
      j->>'sched',
      format($cmd$
    SELECT net.http_post(
      url := 'https://nxmzyykkzwomkcentctt.supabase.co/functions/v1/%s',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s'),
      body := jsonb_build_object(
        'source', 'cron',
        'pipeline_key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'OFFMETA_PIPELINE_KEY' LIMIT 1)
      ),
      timeout_milliseconds := %s
    ) AS request_id;
  $cmd$, j->>'fn', anon, j->>'t')
    );
    PERFORM net.http_post(
      url := 'https://nxmzyykkzwomkcentctt.supabase.co/functions/v1/' || (j->>'fn'),
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || anon),
      body := jsonb_build_object('source','manual-verify','pipeline_key',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='OFFMETA_PIPELINE_KEY' LIMIT 1)),
      timeout_milliseconds := 180000
    );
  END LOOP;
END $$;