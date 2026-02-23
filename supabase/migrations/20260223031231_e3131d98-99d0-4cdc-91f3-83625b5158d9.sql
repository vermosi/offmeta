
-- Fix: search_feedback INSERT policy must be PERMISSIVE (restrictive-only = deny all)
DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.search_feedback;
CREATE POLICY "Anyone can insert feedback"
  ON public.search_feedback
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Also fix SELECT policies so admins/service_role can actually read
DROP POLICY IF EXISTS "Admins can read feedback" ON public.search_feedback;
CREATE POLICY "Admins can read feedback"
  ON public.search_feedback
  FOR SELECT
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update feedback" ON public.search_feedback;
CREATE POLICY "Admins can update feedback"
  ON public.search_feedback
  FOR UPDATE
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "service_role_all_feedback" ON public.search_feedback;
CREATE POLICY "service_role_all_feedback"
  ON public.search_feedback
  FOR ALL
  TO public
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);
