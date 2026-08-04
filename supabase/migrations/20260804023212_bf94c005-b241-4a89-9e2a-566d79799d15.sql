CREATE TABLE public.sitemap_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sitemap_url TEXT NOT NULL,
  site_url TEXT,
  trigger_source TEXT NOT NULL,
  new_url_count INTEGER,
  status TEXT NOT NULL,
  http_status INTEGER,
  error TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_sitemap_submissions_submitted_at ON public.sitemap_submissions (submitted_at DESC);

GRANT SELECT ON public.sitemap_submissions TO authenticated;
GRANT ALL ON public.sitemap_submissions TO service_role;

ALTER TABLE public.sitemap_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sitemap submissions"
ON public.sitemap_submissions
FOR SELECT
TO authenticated
USING (public.has_role('admin'::app_role));