-- Collections -------------------------------------------------------------
CREATE TABLE public.collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL DEFAULT 'collection',
  format TEXT,
  commander_name TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT collections_name_length CHECK (char_length(name) BETWEEN 1 AND 80),
  CONSTRAINT collections_kind_valid CHECK (kind IN ('collection', 'deck'))
);

CREATE UNIQUE INDEX collections_user_name_key
  ON public.collections (user_id, lower(name));
CREATE INDEX collections_user_idx ON public.collections (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT ALL ON public.collections TO service_role;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own collections"
  ON public.collections FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Saved cards --------------------------------------------------------------
CREATE TABLE public.saved_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  oracle_id TEXT NOT NULL,
  card_name TEXT NOT NULL,
  scryfall_id TEXT,
  image_url TEXT,
  mana_cost TEXT,
  cmc REAL,
  type_line TEXT,
  colors TEXT[] NOT NULL DEFAULT '{}',
  price_usd NUMERIC,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT saved_cards_note_length CHECK (note IS NULL OR char_length(note) <= 500)
);

CREATE UNIQUE INDEX saved_cards_user_oracle_key
  ON public.saved_cards (user_id, oracle_id);
CREATE INDEX saved_cards_user_idx ON public.saved_cards (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_cards TO authenticated;
GRANT ALL ON public.saved_cards TO service_role;
ALTER TABLE public.saved_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own saved cards"
  ON public.saved_cards FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_saved_cards_updated_at
  BEFORE UPDATE ON public.saved_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Saved card <-> collection join ------------------------------------------
CREATE TABLE public.saved_card_collections (
  saved_card_id UUID NOT NULL REFERENCES public.saved_cards(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (saved_card_id, collection_id)
);

CREATE INDEX saved_card_collections_collection_idx
  ON public.saved_card_collections (collection_id);
CREATE INDEX saved_card_collections_user_idx
  ON public.saved_card_collections (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_card_collections TO authenticated;
GRANT ALL ON public.saved_card_collections TO service_role;
ALTER TABLE public.saved_card_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own card collection links"
  ON public.saved_card_collections FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Saved searches -----------------------------------------------------------
CREATE TABLE public.saved_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  natural_query TEXT NOT NULL,
  normalized_query TEXT NOT NULL,
  scryfall_query TEXT,
  label TEXT,
  result_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT saved_searches_query_length CHECK (char_length(natural_query) BETWEEN 1 AND 500)
);

CREATE UNIQUE INDEX saved_searches_user_query_key
  ON public.saved_searches (user_id, normalized_query);
CREATE INDEX saved_searches_user_idx ON public.saved_searches (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_searches TO authenticated;
GRANT ALL ON public.saved_searches TO service_role;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own saved searches"
  ON public.saved_searches FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_saved_searches_updated_at
  BEFORE UPDATE ON public.saved_searches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Search history -----------------------------------------------------------
CREATE TABLE public.search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  normalized_query TEXT NOT NULL,
  raw_query TEXT NOT NULL,
  run_count INTEGER NOT NULL DEFAULT 1,
  last_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT search_history_query_length CHECK (char_length(raw_query) BETWEEN 1 AND 500)
);

CREATE UNIQUE INDEX search_history_user_query_key
  ON public.search_history (user_id, normalized_query);
CREATE INDEX search_history_user_recent_idx
  ON public.search_history (user_id, last_run_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.search_history TO authenticated;
GRANT ALL ON public.search_history TO service_role;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own search history"
  ON public.search_history FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Keep history bounded to the 200 most recent entries per user.
CREATE OR REPLACE FUNCTION public.trim_search_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.search_history sh
  WHERE sh.user_id = NEW.user_id
    AND sh.id NOT IN (
      SELECT id FROM public.search_history
      WHERE user_id = NEW.user_id
      ORDER BY last_run_at DESC
      LIMIT 200
    );
  RETURN NULL;
END;
$$;

CREATE TRIGGER trim_search_history_after_insert
  AFTER INSERT ON public.search_history
  FOR EACH ROW EXECUTE FUNCTION public.trim_search_history();