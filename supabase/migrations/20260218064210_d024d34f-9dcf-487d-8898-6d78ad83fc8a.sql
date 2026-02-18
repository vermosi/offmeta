
-- Recreate the view with SECURITY INVOKER so auth.uid() resolves to the calling user,
-- not the view owner. This ensures the user_id masking works correctly.
DROP VIEW IF EXISTS public.decks_public;

CREATE OR REPLACE VIEW public.decks_public
WITH (security_invoker = true)
AS
SELECT
  id,
  name,
  format,
  commander_name,
  companion_name,
  color_identity,
  description,
  is_public,
  card_count,
  created_at,
  updated_at,
  -- Only expose user_id to the deck's own owner; everyone else gets NULL
  CASE WHEN auth.uid() = user_id THEN user_id ELSE NULL END AS user_id
FROM public.decks
WHERE is_public = true;

-- Grant read access to both anonymous and authenticated roles
GRANT SELECT ON public.decks_public TO anon, authenticated;
