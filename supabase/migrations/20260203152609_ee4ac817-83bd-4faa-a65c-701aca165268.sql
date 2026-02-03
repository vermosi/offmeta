-- Completely reset RLS on search_feedback
-- First disable RLS
ALTER TABLE public.search_feedback DISABLE ROW LEVEL SECURITY;

-- Drop all policies
DROP POLICY IF EXISTS "Allow public feedback insert" ON public.search_feedback;
DROP POLICY IF EXISTS "Service role can read feedback" ON public.search_feedback;
DROP POLICY IF EXISTS "Only service role can update feedback" ON public.search_feedback;
DROP POLICY IF EXISTS "Only service role can delete feedback" ON public.search_feedback;

-- Re-enable RLS
ALTER TABLE public.search_feedback ENABLE ROW LEVEL SECURITY;

-- Create single permissive INSERT policy for anon
CREATE POLICY "anon_insert_feedback" 
ON public.search_feedback 
FOR INSERT 
TO anon
WITH CHECK (true);

-- Also allow authenticated users
CREATE POLICY "authenticated_insert_feedback" 
ON public.search_feedback 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Service role full access
CREATE POLICY "service_role_all_feedback" 
ON public.search_feedback 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);