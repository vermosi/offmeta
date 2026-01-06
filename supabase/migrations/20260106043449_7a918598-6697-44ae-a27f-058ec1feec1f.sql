-- Add explicit SELECT policy that denies all public/authenticated access
-- Service role bypasses RLS, so it can still read the data
CREATE POLICY "Only service role can read analytics"
ON public.analytics_events
FOR SELECT
USING (false);

-- Also add policies for search_feedback and translation_rules tables
-- to fix the related security findings

-- search_feedback: deny public SELECT
CREATE POLICY "Only service role can read feedback"
ON public.search_feedback
FOR SELECT
USING (false);

-- translation_rules: update the existing policy to be more restrictive
-- First drop the existing permissive policy
DROP POLICY IF EXISTS "Service role can manage translation rules" ON public.translation_rules;

-- Create explicit deny policies for public access
CREATE POLICY "Only service role can read translation rules"
ON public.translation_rules
FOR SELECT
USING (false);

CREATE POLICY "Only service role can insert translation rules"
ON public.translation_rules
FOR INSERT
WITH CHECK (false);

CREATE POLICY "Only service role can update translation rules"
ON public.translation_rules
FOR UPDATE
USING (false);

CREATE POLICY "Only service role can delete translation rules"
ON public.translation_rules
FOR DELETE
USING (false);