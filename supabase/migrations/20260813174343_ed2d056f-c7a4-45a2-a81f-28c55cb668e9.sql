-- ---------------------------------------------------------------------------
-- Phase 4: concept graph
-- ---------------------------------------------------------------------------
CREATE TABLE public.ontology_edges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_tag text NOT NULL REFERENCES public.ontology_tags(tag_key) ON DELETE CASCADE,
  to_tag text NOT NULL REFERENCES public.ontology_tags(tag_key) ON DELETE CASCADE,
  relation text NOT NULL CHECK (relation IN ('implies', 'answers', 'related')),
  weight numeric NOT NULL DEFAULT 1.0 CHECK (weight > 0 AND weight <= 1),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_tag, to_tag, relation),
  CHECK (from_tag <> to_tag)
);

CREATE INDEX idx_ontology_edges_from ON public.ontology_edges (from_tag);
CREATE INDEX idx_ontology_edges_to ON public.ontology_edges (to_tag);

GRANT SELECT ON public.ontology_edges TO anon, authenticated;
GRANT ALL ON public.ontology_edges TO service_role;
ALTER TABLE public.ontology_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Concept edges are public read" ON public.ontology_edges FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- Phase 5: approach grouping
-- ---------------------------------------------------------------------------
CREATE TABLE public.ontology_approaches (
  approach_key text NOT NULL PRIMARY KEY,
  label text NOT NULL,
  description text NOT NULL,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ontology_approaches TO anon, authenticated;
GRANT ALL ON public.ontology_approaches TO service_role;
ALTER TABLE public.ontology_approaches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approaches are public read" ON public.ontology_approaches FOR SELECT USING (true);

CREATE TABLE public.ontology_tag_approaches (
  tag_key text NOT NULL REFERENCES public.ontology_tags(tag_key) ON DELETE CASCADE,
  approach_key text NOT NULL REFERENCES public.ontology_approaches(approach_key) ON DELETE CASCADE,
  weight numeric NOT NULL DEFAULT 1.0 CHECK (weight > 0 AND weight <= 1),
  PRIMARY KEY (tag_key, approach_key)
);

CREATE INDEX idx_tag_approaches_approach ON public.ontology_tag_approaches (approach_key);

GRANT SELECT ON public.ontology_tag_approaches TO anon, authenticated;
GRANT ALL ON public.ontology_tag_approaches TO service_role;
ALTER TABLE public.ontology_tag_approaches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tag approaches are public read" ON public.ontology_tag_approaches FOR SELECT USING (true);

INSERT INTO public.ontology_approaches (approach_key, label, description, sort_order) VALUES
  ('disable',  'Disable',  'Turn the problem off without removing it.', 10),
  ('destroy',  'Destroy',  'Remove the problem from the board.', 20),
  ('prevent',  'Prevent',  'Stop the problem before it happens.', 30),
  ('punish',   'Punish',   'Create a consequence for the problem.', 40),
  ('tax',      'Tax',      'Make the problem expensive to keep using.', 50),
  ('outvalue', 'Out-value','Build a bigger engine instead of interacting.', 60);

INSERT INTO public.ontology_tag_approaches (tag_key, approach_key, weight) VALUES
  ('static_lock', 'disable', 1.0),
  ('stax', 'disable', 1.0),
  ('untapper', 'disable', 0.4),
  ('removal', 'destroy', 1.0),
  ('board_wipe', 'destroy', 1.0),
  ('land_destruction', 'destroy', 0.9),
  ('bounce', 'destroy', 0.7),
  ('mass_effect', 'destroy', 0.5),
  ('counterspell', 'prevent', 1.0),
  ('discard', 'prevent', 0.8),
  ('protection', 'prevent', 0.8),
  ('replacement_effect', 'prevent', 0.7),
  ('punisher', 'punish', 1.0),
  ('symmetrical', 'punish', 0.5),
  ('death_trigger', 'punish', 0.4),
  ('taxation', 'tax', 1.0),
  ('activation_tax', 'tax', 1.0),
  ('draw', 'outvalue', 1.0),
  ('ramp', 'outvalue', 1.0),
  ('tutor', 'outvalue', 0.9),
  ('recursion', 'outvalue', 0.9),
  ('token_generator', 'outvalue', 0.8),
  ('copy', 'outvalue', 0.8),
  ('blink', 'outvalue', 0.7),
  ('sacrifice_outlet', 'outvalue', 0.6),
  ('activated_engine', 'outvalue', 0.6),
  ('equipment', 'outvalue', 0.5),
  ('pump', 'outvalue', 0.4),
  ('lifegain', 'outvalue', 0.4),
  ('evasion', 'outvalue', 0.4),
  ('mill', 'outvalue', 0.3);

-- ---------------------------------------------------------------------------
-- Seed concept relationships
-- ---------------------------------------------------------------------------
INSERT INTO public.ontology_edges (from_tag, to_tag, relation, weight, note) VALUES
  -- narrower problem sits under a broader problem
  ('treasure_hate', 'artifact_hate', 'implies', 0.9, 'Treasures are artifacts'),
  ('token_hate', 'go_wide_hate', 'implies', 0.8, 'Token decks go wide'),
  ('tutor_hate', 'combo_hate', 'implies', 0.8, 'Tutors assemble combos'),
  ('recursion_hate', 'graveyard_hate', 'implies', 0.9, 'Recursion comes from graveyards'),
  ('combo_hate', 'stax_pressure', 'implies', 0.6, 'Combo hate is a form of resource denial'),
  ('land_destruction', 'land_hate', 'implies', 0.9, 'Land destruction attacks the mana base'),
  ('treasure_hate', 'token_hate', 'related', 0.6, 'Treasures are tokens'),
  ('artifact_hate', 'combo_hate', 'related', 0.5, 'Artifact engines enable combos'),
  ('graveyard_hate', 'combo_hate', 'related', 0.5, 'Graveyard combos'),
  ('go_wide_hate', 'flyer_hate', 'related', 0.4, 'Both answer creature boards'),
  ('draw_hate', 'stax_pressure', 'implies', 0.6, 'Draw taxes are a stax axis'),
  ('lifegain_hate', 'go_wide_hate', 'related', 0.3, 'Lifegain often comes from wide boards'),

  -- roles answering problems
  ('removal', 'artifact_hate', 'answers', 0.9, NULL),
  ('removal', 'enchantment_hate', 'answers', 0.9, NULL),
  ('removal', 'treasure_hate', 'answers', 0.7, NULL),
  ('removal', 'token_hate', 'answers', 0.6, NULL),
  ('removal', 'flyer_hate', 'answers', 0.7, NULL),
  ('removal', 'commander_pressure', 'answers', 0.8, NULL),
  ('board_wipe', 'go_wide_hate', 'answers', 1.0, NULL),
  ('board_wipe', 'token_hate', 'answers', 0.9, NULL),
  ('board_wipe', 'treasure_hate', 'answers', 0.5, NULL),
  ('bounce', 'token_hate', 'answers', 0.6, 'Bounced tokens cease to exist'),
  ('bounce', 'commander_pressure', 'answers', 0.5, NULL),
  ('stax', 'treasure_hate', 'answers', 0.8, NULL),
  ('stax', 'artifact_hate', 'answers', 0.8, NULL),
  ('stax', 'combo_hate', 'answers', 0.9, NULL),
  ('stax', 'stax_pressure', 'answers', 1.0, NULL),
  ('taxation', 'combo_hate', 'answers', 0.8, NULL),
  ('taxation', 'draw_hate', 'answers', 0.7, NULL),
  ('taxation', 'stax_pressure', 'answers', 0.9, NULL),
  ('counterspell', 'combo_hate', 'answers', 0.9, NULL),
  ('counterspell', 'tutor_hate', 'answers', 0.5, NULL),
  ('counterspell', 'counter_hate', 'related', 0.6, NULL),
  ('discard', 'combo_hate', 'answers', 0.6, NULL),
  ('mill', 'graveyard_hate', 'related', 0.5, 'Mill fuels graveyards rather than hating them'),
  ('land_destruction', 'stax_pressure', 'answers', 0.7, NULL),
  ('protection', 'counter_hate', 'answers', 0.6, NULL),
  ('protection', 'commander_pressure', 'related', 0.4, NULL),

  -- methods answering problems
  ('static_lock', 'treasure_hate', 'answers', 0.9, NULL),
  ('static_lock', 'artifact_hate', 'answers', 0.9, NULL),
  ('static_lock', 'graveyard_hate', 'answers', 0.8, NULL),
  ('static_lock', 'combo_hate', 'answers', 0.8, NULL),
  ('static_lock', 'tutor_hate', 'answers', 0.7, NULL),
  ('activation_tax', 'treasure_hate', 'answers', 0.8, NULL),
  ('activation_tax', 'artifact_hate', 'answers', 0.8, NULL),
  ('activation_tax', 'combo_hate', 'answers', 0.7, NULL),
  ('punisher', 'draw_hate', 'answers', 0.8, NULL),
  ('punisher', 'tutor_hate', 'answers', 0.7, NULL),
  ('punisher', 'go_wide_hate', 'answers', 0.4, NULL),
  ('replacement_effect', 'graveyard_hate', 'answers', 0.7, NULL),
  ('replacement_effect', 'token_hate', 'answers', 0.5, NULL),
  ('replacement_effect', 'lifegain_hate', 'answers', 0.6, NULL),
  ('mass_effect', 'go_wide_hate', 'answers', 0.7, NULL),
  ('symmetrical', 'stax_pressure', 'related', 0.5, NULL),

  -- role / method affinities used for "cards like X" expansion
  ('ramp', 'treasure_hate', 'related', 0.4, 'Treasures are a ramp method'),
  ('ramp', 'activated_engine', 'related', 0.4, NULL),
  ('token_generator', 'go_wide_hate', 'related', 0.4, NULL),
  ('sacrifice_outlet', 'death_trigger', 'related', 0.7, NULL),
  ('recursion', 'graveyard_hate', 'related', 0.6, NULL),
  ('blink', 'etb_effect', 'related', 0.8, NULL),
  ('draw', 'draw_hate', 'related', 0.5, NULL),
  ('tutor', 'tutor_hate', 'related', 0.6, NULL),
  ('untapper', 'activated_engine', 'related', 0.6, NULL),
  ('equipment', 'pump', 'related', 0.5, NULL),
  ('copy', 'etb_effect', 'related', 0.5, NULL),
  ('board_wipe', 'mass_effect', 'related', 0.8, NULL),
  ('stax', 'static_lock', 'related', 0.8, NULL),
  ('taxation', 'activation_tax', 'related', 0.8, NULL);

-- ---------------------------------------------------------------------------
-- Concept expansion: walk the graph from a set of seed concepts
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expand_ontology_concepts(
  p_tag_keys text[],
  p_max_depth integer DEFAULT 2,
  p_min_weight numeric DEFAULT 0.2
)
RETURNS TABLE(tag_key text, dimension text, label text, depth integer, weight numeric)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  WITH RECURSIVE seeds AS (
    SELECT DISTINCT k AS tag_key FROM unnest(coalesce(p_tag_keys, ARRAY[]::text[])) AS k
  ),
  walk AS (
    SELECT s.tag_key, 0 AS depth, 1.0::numeric AS weight
    FROM seeds s
    JOIN public.ontology_tags t ON t.tag_key = s.tag_key AND t.is_active
    UNION ALL
    SELECT e.next_tag, w.depth + 1, round(w.weight * e.weight, 4)
    FROM walk w
    JOIN LATERAL (
      SELECT to_tag AS next_tag, weight FROM public.ontology_edges WHERE from_tag = w.tag_key
      UNION ALL
      -- 'related' edges are symmetric; 'implies'/'answers' also walk upward at a discount
      SELECT from_tag AS next_tag,
             CASE WHEN relation = 'related' THEN weight ELSE weight * 0.6 END
      FROM public.ontology_edges WHERE to_tag = w.tag_key
    ) e ON true
    WHERE w.depth < greatest(coalesce(p_max_depth, 2), 0)
      AND w.weight * e.weight >= coalesce(p_min_weight, 0.2)
  ),
  best AS (
    SELECT walk.tag_key, min(depth) AS depth, max(weight) AS weight
    FROM walk GROUP BY walk.tag_key
  )
  SELECT b.tag_key, t.dimension, t.label, b.depth, b.weight
  FROM best b
  JOIN public.ontology_tags t ON t.tag_key = b.tag_key AND t.is_active
  ORDER BY b.depth, b.weight DESC, t.label;
$$;

GRANT EXECUTE ON FUNCTION public.expand_ontology_concepts(text[], integer, numeric) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Approach clustering for a set of result cards
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_search_approaches(
  p_oracle_ids text[],
  p_examples_per_approach integer DEFAULT 4
)
RETURNS TABLE(
  approach_key text,
  label text,
  description text,
  card_count integer,
  concepts text[],
  examples jsonb
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  WITH scored AS (
    SELECT
      ta.approach_key,
      co.oracle_id,
      max(ta.weight) AS weight,
      (array_agg(t.label ORDER BY ta.weight DESC))[1] AS top_concept
    FROM public.card_ontology co
    JOIN public.ontology_tag_approaches ta ON ta.tag_key = co.tag_key
    JOIN public.ontology_tags t ON t.tag_key = co.tag_key
    WHERE co.oracle_id = ANY(coalesce(p_oracle_ids, ARRAY[]::text[]))
    GROUP BY ta.approach_key, co.oracle_id
  ),
  ranked AS (
    SELECT s.*, c.name,
           row_number() OVER (PARTITION BY s.approach_key ORDER BY s.weight DESC, c.name) AS rn
    FROM scored s
    JOIN public.cards c ON c.oracle_id = s.oracle_id
  )
  SELECT
    a.approach_key,
    a.label,
    a.description,
    count(*)::integer AS card_count,
    (SELECT array_agg(DISTINCT r2.top_concept) FROM ranked r2 WHERE r2.approach_key = a.approach_key) AS concepts,
    coalesce(
      jsonb_agg(jsonb_build_object('oracle_id', r.oracle_id, 'name', r.name) ORDER BY r.rn)
        FILTER (WHERE r.rn <= greatest(coalesce(p_examples_per_approach, 4), 1)),
      '[]'::jsonb
    ) AS examples
  FROM ranked r
  JOIN public.ontology_approaches a ON a.approach_key = r.approach_key
  GROUP BY a.approach_key, a.label, a.description, a.sort_order
  ORDER BY count(*) DESC, a.sort_order;
$$;

GRANT EXECUTE ON FUNCTION public.get_search_approaches(text[], integer) TO anon, authenticated, service_role;