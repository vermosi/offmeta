-- Create a view for public decks that excludes user_id
CREATE VIEW public.public_decks AS
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