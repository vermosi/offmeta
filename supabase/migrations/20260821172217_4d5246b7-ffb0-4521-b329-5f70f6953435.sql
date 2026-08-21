CREATE TABLE public.rules_glossary (
  slug TEXT PRIMARY KEY,
  term TEXT NOT NULL,
  term_lower TEXT NOT NULL,
  definition TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  rule_refs TEXT[] NOT NULL DEFAULT '{}',
  scryfall_hint TEXT,
  source TEXT NOT NULL DEFAULT 'yawgatog_cr',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rules_glossary_term_lower ON public.rules_glossary (term_lower);
CREATE INDEX idx_rules_glossary_category ON public.rules_glossary (category);

GRANT SELECT ON public.rules_glossary TO anon;
GRANT SELECT ON public.rules_glossary TO authenticated;
GRANT ALL ON public.rules_glossary TO service_role;

ALTER TABLE public.rules_glossary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rules glossary is publicly readable"
  ON public.rules_glossary FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage rules glossary"
  ON public.rules_glossary FOR ALL
  TO authenticated
  USING (public.has_role('admin'))
  WITH CHECK (public.has_role('admin'));

CREATE TRIGGER update_rules_glossary_updated_at
  BEFORE UPDATE ON public.rules_glossary
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();