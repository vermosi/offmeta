-- Drop the existing view
DROP VIEW IF EXISTS public.public_decks;

-- Recreate the view with SECURITY INVOKER (uses querying user's permissions)
CREATE VIEW public.public_decks 
WITH (security_invoker = true)
AS
SELECT 
  id,
  public_id,
  name,
  description,
  format,
  commander_id,
  commander_name,
  mainboard,
  sideboard,
  created_at,
  updated_at
FROM public.decks
WHERE is_public = true;

-- Grant SELECT permission on the view to authenticated and anon users
GRANT SELECT ON public.public_decks TO authenticated, anon;