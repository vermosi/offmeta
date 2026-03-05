DROP VIEW IF EXISTS public.decks_public;

CREATE VIEW public.decks_public AS
SELECT
  id,
  name,
  format,
  commander_name,
  companion_name,
  color_identity,
  description,
  card_count,
  is_public,
  created_at,
  updated_at
FROM public.decks
WHERE is_public = true;