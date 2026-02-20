-- Allow admins to read translation_rules (for the feedback queue panel)
CREATE POLICY "Admins can read translation rules"
  ON public.translation_rules
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update translation_rules (to toggle is_active)
CREATE POLICY "Admins can update translation rules"
  ON public.translation_rules
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));