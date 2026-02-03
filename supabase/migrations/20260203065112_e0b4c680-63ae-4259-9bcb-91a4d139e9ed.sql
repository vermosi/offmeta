-- Fix RLS policies: The issue is that RESTRICTIVE policies with USING(false) 
-- don't block access when there are no PERMISSIVE policies - need PERMISSIVE policies
-- that properly check conditions.

-- Drop the problematic RESTRICTIVE policies and replace with PERMISSIVE ones

-- ============= search_feedback =============
-- Keep the SELECT policy but make it permissive with proper check
DROP POLICY IF EXISTS "Service role can read feedback" ON public.search_feedback;
CREATE POLICY "Service role can read feedback" 
ON public.search_feedback 
FOR SELECT 
USING (auth.role() = 'service_role');

-- ============= translation_logs =============
-- Current policy blocks everyone including service role - fix it
DROP POLICY IF EXISTS "Only service role can read translation logs" ON public.translation_logs;
CREATE POLICY "Service role can read translation logs" 
ON public.translation_logs 
FOR SELECT 
USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Only service role can insert translation logs" ON public.translation_logs;
CREATE POLICY "Service role can insert translation logs" 
ON public.translation_logs 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- ============= analytics_events =============
-- Keep INSERT open for anonymous analytics, fix SELECT
DROP POLICY IF EXISTS "Service role can read analytics" ON public.analytics_events;
CREATE POLICY "Service role can read analytics" 
ON public.analytics_events 
FOR SELECT 
USING (auth.role() = 'service_role');

-- ============= query_cache =============
-- All operations should be service role only
DROP POLICY IF EXISTS "Service role can read cache" ON public.query_cache;
CREATE POLICY "Service role can read cache" 
ON public.query_cache 
FOR SELECT 
USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can insert cache" ON public.query_cache;
CREATE POLICY "Service role can insert cache" 
ON public.query_cache 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can update cache" ON public.query_cache;
CREATE POLICY "Service role can update cache" 
ON public.query_cache 
FOR UPDATE 
USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can delete cache" ON public.query_cache;
CREATE POLICY "Service role can delete cache" 
ON public.query_cache 
FOR DELETE 
USING (auth.role() = 'service_role');

-- ============= translation_rules =============
-- All operations should be service role only
DROP POLICY IF EXISTS "Only service role can read translation rules" ON public.translation_rules;
CREATE POLICY "Service role can read translation rules" 
ON public.translation_rules 
FOR SELECT 
USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Only service role can insert translation rules" ON public.translation_rules;
CREATE POLICY "Service role can insert translation rules" 
ON public.translation_rules 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Only service role can update translation rules" ON public.translation_rules;
CREATE POLICY "Service role can update translation rules" 
ON public.translation_rules 
FOR UPDATE 
USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Only service role can delete translation rules" ON public.translation_rules;
CREATE POLICY "Service role can delete translation rules" 
ON public.translation_rules 
FOR DELETE 
USING (auth.role() = 'service_role');