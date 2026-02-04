-- Remove ALL existing policies on search_feedback and create clean ones
DROP POLICY IF EXISTS "Anyone can submit search feedback" ON public.search_feedback;
DROP POLICY IF EXISTS "Allow public feedback submission" ON public.search_feedback;
DROP POLICY IF EXISTS "No one can update search feedback" ON public.search_feedback;
DROP POLICY IF EXISTS "No one can delete search feedback" ON public.search_feedback;
DROP POLICY IF EXISTS "Service role can read feedback" ON public.search_feedback;

-- Recreate policies properly (all PERMISSIVE by default)
-- Allow anonymous INSERT
CREATE POLICY "Allow public feedback insert" 
ON public.search_feedback 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Allow service role SELECT
CREATE POLICY "Service role can read feedback" 
ON public.search_feedback 
FOR SELECT 
TO service_role
USING (true);

-- Block UPDATE for everyone except service_role
CREATE POLICY "Only service role can update feedback" 
ON public.search_feedback 
FOR UPDATE 
TO service_role
USING (true);

-- Block DELETE for everyone except service_role
CREATE POLICY "Only service role can delete feedback" 
ON public.search_feedback 
FOR DELETE 
TO service_role
USING (true);