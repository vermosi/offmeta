ALTER TABLE public.price_snapshots
  ADD COLUMN IF NOT EXISTS price_low numeric,
  ADD COLUMN IF NOT EXISTS price_average numeric,
  ADD COLUMN IF NOT EXISTS price_market numeric,
  ADD COLUMN IF NOT EXISTS price_foil numeric;

CREATE UNIQUE INDEX IF NOT EXISTS idx_price_snapshots_card_source_recorded
  ON public.price_snapshots (card_name, source, recorded_at);
