-- Ensure anon role has all necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT INSERT ON public.search_feedback TO anon;
GRANT SELECT ON public.search_feedback TO anon;