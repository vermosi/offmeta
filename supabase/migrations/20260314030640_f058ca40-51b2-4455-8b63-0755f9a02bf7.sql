
-- Curated SEO search pages: editorial + auto-populated high-value searches
CREATE TABLE public.curated_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  scryfall_query text NOT NULL,
  natural_query text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  priority numeric NOT NULL DEFAULT 0.6,
  is_active boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'editorial',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast slug lookups and category browsing
CREATE INDEX idx_curated_searches_slug ON public.curated_searches (slug);
CREATE INDEX idx_curated_searches_category ON public.curated_searches (category) WHERE is_active = true;

-- RLS
ALTER TABLE public.curated_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active curated searches"
  ON public.curated_searches FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Service role can manage curated searches"
  ON public.curated_searches FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can manage curated searches"
  ON public.curated_searches FOR ALL
  TO authenticated
  USING (public.has_role('admin'))
  WITH CHECK (public.has_role('admin'));
