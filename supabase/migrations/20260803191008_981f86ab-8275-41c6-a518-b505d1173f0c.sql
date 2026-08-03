ALTER TABLE public.price_snapshots
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'scryfall',
  ADD COLUMN IF NOT EXISTS price_low numeric,
  ADD COLUMN IF NOT EXISTS price_average numeric,
  ADD COLUMN IF NOT EXISTS price_market numeric,
  ADD COLUMN IF NOT EXISTS price_foil numeric;

CREATE UNIQUE INDEX IF NOT EXISTS idx_price_snapshots_card_source_recorded
  ON public.price_snapshots (card_name, source, recorded_at);

CREATE TABLE IF NOT EXISTS public.card_printings (
  id text PRIMARY KEY,
  scryfall_id text,
  mtgjson_uuid text,
  oracle_id text,
  name text NOT NULL,
  "set" text,
  set_name text,
  collector_number text,
  rarity text,
  artist text,
  prices jsonb,
  image_url text,
  purchase_uris jsonb,
  identifiers jsonb,
  related_cards jsonb,
  released_at text,
  lang text NOT NULL DEFAULT 'en',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_printings_name ON public.card_printings (name);
CREATE INDEX IF NOT EXISTS idx_card_printings_oracle_id ON public.card_printings (oracle_id);

GRANT SELECT ON public.card_printings TO anon, authenticated;
GRANT ALL ON public.card_printings TO service_role;

ALTER TABLE public.card_printings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read card printings"
  ON public.card_printings FOR SELECT USING (true);

CREATE POLICY "Service role can manage card printings"
  ON public.card_printings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');