CREATE TABLE public.search_regression_corpus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  locale text NOT NULL DEFAULT 'en',
  source text NOT NULL DEFAULT 'manual',
  expected_min_results integer NOT NULL DEFAULT 1,
  min_confidence numeric NOT NULL DEFAULT 0.75,
  active boolean NOT NULL DEFAULT true,
  last_checked_at timestamptz,
  last_confidence numeric,
  last_result_count integer,
  consecutive_failures integer NOT NULL DEFAULT 0,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX search_regression_corpus_query_key
  ON public.search_regression_corpus (lower(query), locale);
CREATE INDEX search_regression_corpus_active_idx
  ON public.search_regression_corpus (last_checked_at NULLS FIRST)
  WHERE active AND archived_at IS NULL;

CREATE TABLE public.search_regression_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'running',
  trigger_source text NOT NULL DEFAULT 'cron',
  app_version text,
  total integer NOT NULL DEFAULT 0,
  passed integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  low_confidence integer NOT NULL DEFAULT 0,
  repair_invoked boolean NOT NULL DEFAULT false,
  repaired integer NOT NULL DEFAULT 0,
  avg_confidence numeric,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX search_regression_runs_started_idx
  ON public.search_regression_runs (started_at DESC);

CREATE TABLE public.search_regression_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.search_regression_runs(id) ON DELETE CASCADE,
  query text NOT NULL,
  locale text NOT NULL DEFAULT 'en',
  scryfall_query text,
  confidence numeric,
  result_count integer,
  passed boolean NOT NULL DEFAULT false,
  failure_reason text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX search_regression_results_run_idx
  ON public.search_regression_results (run_id);
CREATE INDEX search_regression_results_failed_idx
  ON public.search_regression_results (created_at DESC)
  WHERE passed = false;

GRANT SELECT ON public.search_regression_corpus TO authenticated;
GRANT SELECT ON public.search_regression_runs TO authenticated;
GRANT SELECT ON public.search_regression_results TO authenticated;
GRANT ALL ON public.search_regression_corpus TO service_role;
GRANT ALL ON public.search_regression_runs TO service_role;
GRANT ALL ON public.search_regression_results TO service_role;

ALTER TABLE public.search_regression_corpus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_regression_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_regression_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view regression corpus"
  ON public.search_regression_corpus FOR SELECT TO authenticated
  USING (public.has_role('admin'::public.app_role));
CREATE POLICY "Admins can view regression runs"
  ON public.search_regression_runs FOR SELECT TO authenticated
  USING (public.has_role('admin'::public.app_role));
CREATE POLICY "Admins can view regression results"
  ON public.search_regression_results FOR SELECT TO authenticated
  USING (public.has_role('admin'::public.app_role));

CREATE TRIGGER update_search_regression_corpus_updated_at
  BEFORE UPDATE ON public.search_regression_corpus
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_search_regression_runs_updated_at
  BEFORE UPDATE ON public.search_regression_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the corpus with the recurring low-confidence and zero-result searches
-- already captured in telemetry, plus the curated regression queries.
INSERT INTO public.search_regression_corpus (query, locale, source, min_confidence)
SELECT DISTINCT ON (lower(q.query)) q.query, 'en', 'seed_telemetry', 0.75
FROM (
  SELECT natural_language_query AS query
  FROM public.translation_logs
  WHERE created_at > now() - interval '30 days'
    AND natural_language_query IS NOT NULL
    AND length(natural_language_query) BETWEEN 3 AND 120
    AND (confidence_score IS NULL OR confidence_score < 0.75)
) q
ON CONFLICT DO NOTHING;

INSERT INTO public.search_regression_corpus (query, locale, source, min_confidence)
VALUES
  ('cheap red treasure cards', 'en', 'curated', 0.75),
  ('commander legal tutors under $10', 'en', 'curated', 0.75),
  ('cards like Rhystic Study', 'en', 'curated', 0.75),
  ('mono black sacrifice outlets', 'en', 'curated', 0.75),
  ('anthem in boros color identity that gives your creatures indestructible', 'en', 'curated', 0.7),
  ('retro frame cards', 'en', 'curated', 0.75),
  ('borderless cards', 'en', 'curated', 0.75),
  ('mana burn', 'en', 'curated', 0.7),
  ('budget game-enders', 'en', 'curated', 0.7),
  ('las mejores cartas para sephiroth', 'es', 'curated', 0.6),
  ('レトロフレームのカード', 'ja', 'curated', 0.6),
  ('레트로 프레임 카드', 'ko', 'curated', 0.6),
  ('карты с рамкой ретро', 'ru', 'curated', 0.6),
  ('复古边框卡牌', 'zhs', 'curated', 0.6)
ON CONFLICT DO NOTHING;