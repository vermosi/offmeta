-- Drop the overly restrictive SELECT policy
DROP POLICY IF EXISTS "Only service role can read analytics" ON public.analytics_events;

-- Create a new SELECT policy that allows service role to read
CREATE POLICY "Service role can read analytics" 
ON public.analytics_events 
FOR SELECT 
USING (auth.role() = 'service_role');