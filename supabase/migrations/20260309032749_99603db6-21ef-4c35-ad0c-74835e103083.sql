CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Add index on price_snapshots for efficient trend queries
CREATE INDEX IF NOT EXISTS idx_price_snapshots_card_recorded
  ON public.price_snapshots (card_name, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_price_snapshots_recorded_at
  ON public.price_snapshots (recorded_at DESC);