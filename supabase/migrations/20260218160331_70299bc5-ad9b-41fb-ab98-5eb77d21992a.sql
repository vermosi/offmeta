
-- Allow admins to update search_feedback (e.g. mark as done) from the client
CREATE POLICY "Admins can update feedback"
ON public.search_feedback
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all feedback
CREATE POLICY "Admins can read feedback"
ON public.search_feedback
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
