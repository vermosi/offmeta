
-- Create a view that masks user_id for non-owners on public deck listings.
-- Owners still see their own user_id; anonymous/other users get NULL.
CREATE OR REPLACE VIEW public.decks_public AS
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
  -- Mask user_id: only expose it to the deck owner
  CASE WHEN auth.uid() = user_id THEN user_id ELSE NULL END AS user_id
FROM public.decks
WHERE is_public = true;

-- Grant read access to the view for anonymous and authenticated roles
GRANT SELECT ON public.decks_public TO anon, authenticated;

-- Drop the overly-permissive public SELECT policy that exposes user_id via the base table
DROP POLICY IF EXISTS "Anyone can view public decks" ON public.decks;
