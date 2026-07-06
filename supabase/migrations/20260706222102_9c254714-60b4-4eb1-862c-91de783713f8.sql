
-- Remove defunct Spicerack import cron
SELECT cron.unschedule('spicerack-import-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'spicerack-import-daily'
);

-- Schedule replacement TopDeck.gg tournament import (daily, previous day)
SELECT cron.schedule(
  'topdeck-import-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://nxmzyykkzwomkcentctt.supabase.co/functions/v1/topdeck-import',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bXp5eWtrendvbWtjZW50Y3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMzgwOTYsImV4cCI6MjA4MDgxNDA5Nn0.sJbaqJuvKqIMYV0D2Q4iWgTRlzVGih7OXRRkGmDsGPY", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bXp5eWtrendvbWtjZW50Y3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMzgwOTYsImV4cCI6MjA4MDgxNDA5Nn0.sJbaqJuvKqIMYV0D2Q4iWgTRlzVGih7OXRRkGmDsGPY"}'::jsonb,
    body := '{"num_days": 1}'::jsonb
  ) AS request_id;
  $$
);
