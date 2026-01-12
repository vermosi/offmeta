-- Add explicit UPDATE policy that blocks all users
CREATE POLICY "No one can update search feedback"
ON public.search_feedback
FOR UPDATE
USING (false);

-- Add explicit DELETE policy that blocks all users
CREATE POLICY "No one can delete search feedback"
ON public.search_feedback
FOR DELETE
USING (false);