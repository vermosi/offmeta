-- Persist Scryfall printings so the app can read them locally instead of
-- hitting the public API for every printing picker / modal open.
CREATE TABLE IF NOT EXISTS public.card_printings (
  id text PRIMARY KEY,
  scryfall_id text,
  mtgjson_uuid text NOT NULL,
  oracle_id text NOT NULL,
  name text NOT NULL,
  set text NOT NULL,
  set_name text NOT NULL,
  collector_number text NOT NULL,
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

ALTER TABLE public.card_printings
  ADD COLUMN IF NOT EXISTS scryfall_id text,
  ADD COLUMN IF NOT EXISTS mtgjson_uuid text,
  ADD COLUMN IF NOT EXISTS identifiers jsonb,
  ADD COLUMN IF NOT EXISTS related_cards jsonb;

UPDATE public.card_printings
SET mtgjson_uuid = COALESCE(mtgjson_uuid, id)
WHERE mtgjson_uuid IS NULL;

ALTER TABLE public.card_printings
  ALTER COLUMN mtgjson_uuid SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_card_printings_scryfall_id ON public.card_printings (scryfall_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_card_printings_mtgjson_uuid ON public.card_printings (mtgjson_uuid);
CREATE INDEX IF NOT EXISTS idx_card_printings_oracle_id ON public.card_printings (oracle_id);
CREATE INDEX IF NOT EXISTS idx_card_printings_name ON public.card_printings (name);
CREATE INDEX IF NOT EXISTS idx_card_printings_set ON public.card_printings (set);

ALTER TABLE public.card_printings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read card printings"
  ON public.card_printings FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage card printings"
  ON public.card_printings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule('card-printings-sync-weekly')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'card-printings-sync-weekly'
);

SELECT cron.schedule(
  'card-printings-sync-weekly',
  '30 5 * * 0',
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/card-printings-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('page', 1)
    );
  $$
);
