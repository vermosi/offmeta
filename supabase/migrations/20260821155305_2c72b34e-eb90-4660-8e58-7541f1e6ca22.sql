ALTER TABLE public.search_intent_clusters ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.search_intent_clusters FROM anon;
GRANT SELECT ON public.search_intent_clusters TO authenticated;
GRANT ALL ON public.search_intent_clusters TO service_role;

DROP POLICY IF EXISTS "Admins can view search intent clusters" ON public.search_intent_clusters;
CREATE POLICY "Admins can view search intent clusters"
ON public.search_intent_clusters
FOR SELECT
TO authenticated
USING (public.has_role('admin'::public.app_role));