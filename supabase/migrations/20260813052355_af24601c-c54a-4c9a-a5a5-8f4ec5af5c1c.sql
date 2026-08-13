CREATE TABLE public.semrush_cache (
  cache_key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.semrush_cache TO authenticated;
GRANT ALL ON public.semrush_cache TO service_role;

ALTER TABLE public.semrush_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read semrush cache"
ON public.semrush_cache
FOR SELECT
TO authenticated
USING (public.has_role('admin'::app_role));