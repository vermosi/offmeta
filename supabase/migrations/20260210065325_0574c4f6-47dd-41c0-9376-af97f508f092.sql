
-- Remove overly permissive SELECT policies on search_feedback
DROP POLICY IF EXISTS "anon_select_own_feedback" ON public.search_feedback;
DROP POLICY IF EXISTS "authenticated_select_own_feedback" ON public.search_feedback;
