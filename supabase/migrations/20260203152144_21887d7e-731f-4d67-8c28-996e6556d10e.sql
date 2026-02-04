-- Check current policies and ensure they are correct for public feedback submission
-- The issue may be that the anon role doesn't have proper grants

-- Grant INSERT on search_feedback to anon role explicitly
GRANT INSERT ON public.search_feedback TO anon;

-- Also ensure the RLS policy targets the anon role correctly
-- Drop and recreate if needed
DROP POLICY IF EXISTS "Allow public feedback submission" ON public.search_feedback;

CREATE POLICY "Allow public feedback submission" 
ON public.search_feedback 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);