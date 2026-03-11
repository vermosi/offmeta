CREATE TABLE IF NOT EXISTS public.card_mechanics_cache (
  card_id TEXT PRIMARY KEY,
  oracle_text TEXT NOT NULL,
  mechanics TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_mechanics_cache_updated_at
  ON public.card_mechanics_cache (updated_at DESC);

ALTER TABLE public.card_mechanics_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage card mechanics cache" ON public.card_mechanics_cache;
CREATE POLICY "Service role can manage card mechanics cache"
  ON public.card_mechanics_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);
