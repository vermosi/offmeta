-- Drop the restrictive INSERT policy and replace with permissive one
DROP POLICY IF EXISTS "Anyone can submit search feedback" ON public.search_feedback;

-- Create a permissive INSERT policy (default is permissive when not specified)
CREATE POLICY "Allow public feedback submission" 
ON public.search_feedback 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);