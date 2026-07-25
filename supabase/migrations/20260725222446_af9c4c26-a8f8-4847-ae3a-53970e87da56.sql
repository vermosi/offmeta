CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Fast case-insensitive exact and prefix match: lower(name) with text_pattern_ops
CREATE INDEX IF NOT EXISTS idx_cards_lower_name
  ON public.cards (lower(name) text_pattern_ops);

-- Fast ILIKE '%...%' substring / fuzzy match via trigram GIN
CREATE INDEX IF NOT EXISTS idx_cards_name_trgm
  ON public.cards USING gin (name extensions.gin_trgm_ops);

ANALYZE public.cards;