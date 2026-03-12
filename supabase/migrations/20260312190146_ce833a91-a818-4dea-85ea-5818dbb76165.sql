-- Lightweight card name lookup table populated from Scryfall catalog
CREATE TABLE public.card_names (
  name_lower text PRIMARY KEY,
  name text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.card_names ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read card names"
  ON public.card_names FOR SELECT
  TO public USING (true);

CREATE POLICY "Service role can manage card names"
  ON public.card_names FOR ALL
  TO public USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

CREATE INDEX idx_card_names_prefix ON public.card_names USING btree (name_lower text_pattern_ops);