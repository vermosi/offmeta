CREATE TABLE public.answer_index (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question text NOT NULL,
  keywords text[] NOT NULL DEFAULT '{}',
  card_names text[] NOT NULL DEFAULT '{}',
  scryfall_query text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0.8,
  source text NOT NULL DEFAULT 'ai',
  hit_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX answer_index_question_key ON public.answer_index (question);
CREATE INDEX answer_index_keywords_idx ON public.answer_index USING gin (keywords);

GRANT SELECT ON public.answer_index TO anon;
GRANT SELECT ON public.answer_index TO authenticated;
GRANT ALL ON public.answer_index TO service_role;

ALTER TABLE public.answer_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Answer index is publicly readable"
ON public.answer_index FOR SELECT
USING (true);

CREATE POLICY "Admins manage answer index"
ON public.answer_index FOR ALL
TO authenticated
USING (public.has_role('admin'::app_role))
WITH CHECK (public.has_role('admin'::app_role));

CREATE TRIGGER update_answer_index_updated_at
BEFORE UPDATE ON public.answer_index
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();