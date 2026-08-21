WITH p AS (
  SELECT id,
    (regexp_match(scryfall_query, '^\((\(.*?\)) or \((.*)\)\)(.*)$'))[1] AS names,
    (regexp_match(scryfall_query, '^\((\(.*?\)) or \((.*)\)\)(.*)$'))[2] AS broader,
    (regexp_match(scryfall_query, '^\((\(.*?\)) or \((.*)\)\)(.*)$'))[3] AS tail
  FROM public.answer_index
  WHERE scryfall_query ~ '^\(\(!'
)
UPDATE public.answer_index a
SET scryfall_query = p.names || p.tail,
    updated_at = now()
FROM p
WHERE a.id = p.id
  AND p.names IS NOT NULL
  AND (SELECT count(*) FROM regexp_matches(regexp_replace(p.broader, '"[^"]*"', '""', 'g'), '-?\w+(:|<=|>=|=|<|>)', 'g')) < 2;