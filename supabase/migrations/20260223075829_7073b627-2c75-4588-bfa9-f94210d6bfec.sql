
-- Drop all existing RESTRICTIVE policies on search_feedback
DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.search_feedback;
DROP POLICY IF EXISTS "Admins can read feedback" ON public.search_feedback;
DROP POLICY IF EXISTS "Admins can update feedback" ON public.search_feedback;
DROP POLICY IF EXISTS "service_role_all_feedback" ON public.search_feedback;

-- Recreate as PERMISSIVE (the default)
CREATE POLICY "Anyone can insert feedback"
  ON public.search_feedback FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can read feedback"
  ON public.search_feedback FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update feedback"
  ON public.search_feedback FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role full access feedback"
  ON public.search_feedback FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
