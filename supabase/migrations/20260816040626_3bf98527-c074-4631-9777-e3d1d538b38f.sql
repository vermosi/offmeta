SELECT net.http_post(
  url := 'https://nxmzyykkzwomkcentctt.supabase.co/functions/v1/warmup-cache',
  headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bXp5eWtrendvbWtjZW50Y3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMzgwOTYsImV4cCI6MjA4MDgxNDA5Nn0.sJbaqJuvKqIMYV0D2Q4iWgTRlzVGih7OXRRkGmDsGPY'),
  body := jsonb_build_object('source','manual-verify','pipeline_key',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='OFFMETA_PIPELINE_KEY' LIMIT 1)),
  timeout_milliseconds := 180000
);