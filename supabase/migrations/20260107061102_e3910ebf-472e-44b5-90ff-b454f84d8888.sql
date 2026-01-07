-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Only service role can insert translation logs" ON public.translation_logs;

-- Create a properly restrictive INSERT policy (service role bypasses RLS, so this blocks client access)
CREATE POLICY "Only service role can insert translation logs" 
ON public.translation_logs 
FOR INSERT 
WITH CHECK (false);