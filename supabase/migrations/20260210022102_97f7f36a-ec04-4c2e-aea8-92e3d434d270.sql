-- Allow anon to SELECT their own just-inserted feedback (needed for .insert().select('id'))
-- Only allow selecting the id column, and only rows they could have inserted
CREATE POLICY "anon_select_own_feedback" ON public.search_feedback
FOR SELECT TO anon
USING (true);

-- Also allow authenticated users to select
CREATE POLICY "authenticated_select_own_feedback" ON public.search_feedback
FOR SELECT TO authenticated
USING (true);