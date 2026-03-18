
-- SEO pages table for AI-optimized landing pages
CREATE TABLE public.seo_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_seo_pages_slug ON public.seo_pages (slug);
CREATE INDEX idx_seo_pages_status ON public.seo_pages (status);

-- RLS
ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;

-- Anyone can read published pages
CREATE POLICY "Anyone can read published seo pages"
  ON public.seo_pages FOR SELECT
  TO public
  USING (status = 'published');

-- Admins can manage all seo pages
CREATE POLICY "Admins can manage seo pages"
  ON public.seo_pages FOR ALL
  TO authenticated
  USING (public.has_role('admin'::app_role))
  WITH CHECK (public.has_role('admin'::app_role));

-- Service role can manage seo pages
CREATE POLICY "Service role can manage seo pages"
  ON public.seo_pages FOR ALL
  TO public
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Updated_at trigger
CREATE TRIGGER update_seo_pages_updated_at
  BEFORE UPDATE ON public.seo_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
