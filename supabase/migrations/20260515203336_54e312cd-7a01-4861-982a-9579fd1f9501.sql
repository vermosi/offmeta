-- Replace the overly permissive public-read policy on profiles
DROP POLICY IF EXISTS "Anyone can view public profiles" ON public.profiles;

CREATE POLICY "Public can view profiles with a display name"
ON public.profiles
FOR SELECT
USING (display_name IS NOT NULL AND length(trim(display_name)) > 0);
