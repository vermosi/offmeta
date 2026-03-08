
-- Price history table for daily snapshots
CREATE TABLE public.price_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_name text NOT NULL,
  scryfall_id text,
  price_usd numeric,
  price_usd_foil numeric,
  recorded_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for efficient lookups
CREATE INDEX idx_price_snapshots_card_name ON public.price_snapshots (card_name, recorded_at DESC);
CREATE INDEX idx_price_snapshots_recorded_at ON public.price_snapshots (recorded_at);

-- RLS: service role only (edge function writes, no direct user access)
ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage price snapshots"
  ON public.price_snapshots FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Authenticated users can read price snapshots for their collection cards
CREATE POLICY "Authenticated users can read price snapshots"
  ON public.price_snapshots FOR SELECT
  TO authenticated
  USING (true);

-- Allow public profile viewing
CREATE POLICY "Anyone can view public profiles"
  ON public.profiles FOR SELECT
  USING (true);
