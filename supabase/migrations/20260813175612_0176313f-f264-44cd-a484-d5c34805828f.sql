-- OffMeta semantic data layer (Phase 8): read-only profile / search / concept RPCs.

CREATE OR REPLACE FUNCTION public.get_card_profiles(p_names text[])
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  WITH wanted AS (
    SELECT DISTINCT lower(btrim(n)) AS name_lower
    FROM unnest(coalesce(p_names, ARRAY[]::text[])) AS n
    WHERE btrim(coalesce(n, '')) <> ''
  ),
  matched AS (
    SELECT DISTINCT ON (w.name_lower)
      w.name_lower,
      c.oracle_id,
      c.name,
      c.mana_cost,
      c.cmc,
      c.type_line,
      c.oracle_text,
      c.colors,
      c.rarity,
      c.legalities,
      c.image_url
    FROM wanted w
    JOIN public.cards c ON lower(c.name) = w.name_lower
    ORDER BY w.name_lower, c.name
  ),
  tagged AS (
    SELECT
      m.oracle_id,
      t.dimension,
      jsonb_agg(
        jsonb_build_object('key', t.tag_key, 'label', t.label, 'description', t.description)
        ORDER BY t.priority, t.label
      ) AS items
    FROM matched m
    JOIN public.card_ontology co ON co.oracle_id = m.oracle_id
    JOIN public.ontology_tags t ON t.tag_key = co.tag_key AND t.is_active
    GROUP BY m.oracle_id, t.dimension
  ),
  by_dimension AS (
    SELECT oracle_id, jsonb_object_agg(lower(dimension), items) AS dims
    FROM tagged GROUP BY oracle_id
  ),
  approaches AS (
    SELECT
      m.oracle_id,
      jsonb_agg(DISTINCT jsonb_build_object('key', a.approach_key, 'label', a.label)) AS items
    FROM matched m
    JOIN public.card_ontology co ON co.oracle_id = m.oracle_id
    JOIN public.ontology_tag_approaches ta ON ta.tag_key = co.tag_key
    JOIN public.ontology_approaches a ON a.approach_key = ta.approach_key
    GROUP BY m.oracle_id
  )
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'oracle_id', m.oracle_id,
        'name', m.name,
        'mana_cost', m.mana_cost,
        'cmc', m.cmc,
        'type_line', m.type_line,
        'colors', to_jsonb(m.colors),
        'rarity', m.rarity,
        'legalities', coalesce(m.legalities, '{}'::jsonb),
        'image_url', m.image_url,
        'roles', coalesce(d.dims->'role', '[]'::jsonb),
        'methods', coalesce(d.dims->'method', '[]'::jsonb),
        'problems', coalesce(d.dims->'problem', '[]'::jsonb),
        'characteristics', coalesce(d.dims->'characteristic', '[]'::jsonb),
        'approaches', coalesce(ap.items, '[]'::jsonb)
      )
      ORDER BY m.name
    ),
    '[]'::jsonb
  )
  FROM matched m
  LEFT JOIN by_dimension d ON d.oracle_id = m.oracle_id
  LEFT JOIN approaches ap ON ap.oracle_id = m.oracle_id;
$$;

CREATE OR REPLACE FUNCTION public.search_card_profiles(
  p_tag_keys text[],
  p_colors text[] DEFAULT NULL,
  p_match text DEFAULT 'any',
  p_limit integer DEFAULT 40
)
RETURNS TABLE(
  oracle_id text,
  name text,
  mana_cost text,
  cmc real,
  type_line text,
  colors text[],
  rarity text,
  image_url text,
  matched_tags text[],
  match_count integer
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  WITH seeds AS (
    SELECT DISTINCT k FROM unnest(coalesce(p_tag_keys, ARRAY[]::text[])) AS k WHERE btrim(k) <> ''
  ),
  hits AS (
    SELECT co.oracle_id, array_agg(DISTINCT co.tag_key) AS tags, count(DISTINCT co.tag_key)::int AS n
    FROM public.card_ontology co
    JOIN seeds s ON s.k = co.tag_key
    GROUP BY co.oracle_id
  )
  SELECT
    c.oracle_id, c.name, c.mana_cost, c.cmc, c.type_line, c.colors, c.rarity, c.image_url,
    h.tags, h.n
  FROM hits h
  JOIN public.cards c ON c.oracle_id = h.oracle_id
  WHERE (
      lower(coalesce(p_match, 'any')) <> 'all'
      OR h.n = (SELECT count(*) FROM seeds)
    )
    AND (
      p_colors IS NULL
      OR cardinality(p_colors) = 0
      OR c.colors <@ p_colors
    )
  ORDER BY h.n DESC, c.cmc, c.name
  LIMIT greatest(least(coalesce(p_limit, 40), 200), 1);
$$;

CREATE OR REPLACE FUNCTION public.list_ontology_concepts()
RETURNS TABLE(
  tag_key text,
  dimension text,
  label text,
  description text,
  card_count integer,
  approaches text[],
  related text[]
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT
    t.tag_key,
    t.dimension,
    t.label,
    t.description,
    coalesce(cc.n, 0)::int AS card_count,
    coalesce(ap.keys, ARRAY[]::text[]) AS approaches,
    coalesce(rel.keys, ARRAY[]::text[]) AS related
  FROM public.ontology_tags t
  LEFT JOIN (
    SELECT co.tag_key, count(*)::int AS n FROM public.card_ontology co GROUP BY co.tag_key
  ) cc ON cc.tag_key = t.tag_key
  LEFT JOIN (
    SELECT ta.tag_key, array_agg(DISTINCT ta.approach_key) AS keys
    FROM public.ontology_tag_approaches ta GROUP BY ta.tag_key
  ) ap ON ap.tag_key = t.tag_key
  LEFT JOIN (
    SELECT k AS tag_key, array_agg(DISTINCT other) AS keys
    FROM (
      SELECT from_tag AS k, to_tag AS other FROM public.ontology_edges
      UNION ALL
      SELECT to_tag AS k, from_tag AS other FROM public.ontology_edges
    ) e GROUP BY k
  ) rel ON rel.tag_key = t.tag_key
  WHERE t.is_active
  ORDER BY t.dimension, t.priority, t.label;
$$;

GRANT EXECUTE ON FUNCTION public.get_card_profiles(text[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_card_profiles(text[], text[], text, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_ontology_concepts() TO anon, authenticated, service_role;