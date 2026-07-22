
-- 1) profiles: restrict public SELECT to profiles owning at least one public deck
DROP POLICY IF EXISTS "Public can view profiles with a display name" ON public.profiles;
CREATE POLICY "Public can view profiles of public deck authors"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (
    display_name IS NOT NULL
    AND length(trim(display_name)) > 0
    AND EXISTS (
      SELECT 1 FROM public.decks d
      WHERE d.user_id = profiles.id AND d.is_public = true
    )
  );

-- 2) price_snapshots: market pricing is non-sensitive public data; make read public
--    and scope existing policy correctly (removes the "authenticated USING true" concern).
DROP POLICY IF EXISTS "Authenticated users can read price snapshots" ON public.price_snapshots;
CREATE POLICY "Anyone can read price snapshots"
  ON public.price_snapshots
  FOR SELECT
  TO anon, authenticated
  USING (true);
GRANT SELECT ON public.price_snapshots TO anon;

-- 3) email_send_state: add an explicit restrictive SELECT policy so no non-service
--    role can ever read the table, even if a permissive policy is added later.
CREATE POLICY "Block non-service reads of email_send_state"
  ON public.email_send_state
  AS RESTRICTIVE
  FOR SELECT
  TO anon, authenticated
  USING (false);
