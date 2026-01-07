-- Drop the overly restrictive SELECT policy
DROP POLICY IF EXISTS "Only service role can read feedback" ON public.search_feedback;

-- Create a new SELECT policy that allows service role to read
CREATE POLICY "Service role can read feedback" 
ON public.search_feedback 
FOR SELECT 
USING (auth.role() = 'service_role');