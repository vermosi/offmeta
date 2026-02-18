-- Drop duplicate anon/authenticated INSERT policies on search_feedback
-- Keep only the service_role_all_feedback (ALL) policy for admin access
-- and add a single public INSERT policy that covers both anon and authenticated
DROP POLICY IF EXISTS "anon_insert_feedback" ON public.search_feedback;
DROP POLICY IF EXISTS "authenticated_insert_feedback" ON public.search_feedback;

-- Single INSERT policy on the public role (covers anon + authenticated)
CREATE POLICY "Anyone can insert feedback"
  ON public.search_feedback
  FOR INSERT
  WITH CHECK (true);