CREATE POLICY "Anyone can read non-expired cache entries"
ON public.query_cache
FOR SELECT
TO public
USING (expires_at > now());