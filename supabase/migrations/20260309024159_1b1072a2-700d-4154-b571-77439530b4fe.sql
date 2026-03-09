
-- Community decks (imported from external sources, separate from user decks)
CREATE TABLE public.community_decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  format text NOT NULL DEFAULT 'commander',
  source text NOT NULL,
  source_id text,
  commander text,
  colors text[] NOT NULL DEFAULT '{}',
  archetype text,
  event_name text,
  event_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint to prevent duplicate imports
CREATE UNIQUE INDEX idx_community_decks_source ON public.community_decks (source, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX idx_community_decks_format ON public.community_decks (format);
CREATE INDEX idx_community_decks_archetype ON public.community_decks (archetype) WHERE archetype IS NOT NULL;

ALTER TABLE public.community_decks ENABLE ROW LEVEL SECURITY;

-- Public read, service role write
CREATE POLICY "Anyone can read community decks"
  ON public.community_decks FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage community decks"
  ON public.community_decks FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Community deck cards
CREATE TABLE public.community_deck_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL REFERENCES public.community_decks(id) ON DELETE CASCADE,
  card_name text NOT NULL,
  scryfall_oracle_id text,
  quantity integer NOT NULL DEFAULT 1,
  board text NOT NULL DEFAULT 'mainboard'
);

CREATE INDEX idx_community_deck_cards_deck ON public.community_deck_cards (deck_id);
CREATE INDEX idx_community_deck_cards_oracle ON public.community_deck_cards (scryfall_oracle_id) WHERE scryfall_oracle_id IS NOT NULL;

ALTER TABLE public.community_deck_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read community deck cards"
  ON public.community_deck_cards FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage community deck cards"
  ON public.community_deck_cards FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Cards metadata cache (Scryfall data)
CREATE TABLE public.cards (
  oracle_id text PRIMARY KEY,
  name text NOT NULL,
  mana_cost text,
  type_line text,
  oracle_text text,
  colors text[] NOT NULL DEFAULT '{}',
  cmc real NOT NULL DEFAULT 0,
  image_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cards"
  ON public.cards FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage cards"
  ON public.cards FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Card co-occurrence (synergy graph)
CREATE TABLE public.card_cooccurrence (
  card_a_oracle_id text NOT NULL,
  card_b_oracle_id text NOT NULL,
  cooccurrence_count integer NOT NULL DEFAULT 1,
  format text NOT NULL DEFAULT 'all',
  PRIMARY KEY (card_a_oracle_id, card_b_oracle_id, format)
);

CREATE INDEX idx_cooccurrence_a ON public.card_cooccurrence (card_a_oracle_id, cooccurrence_count DESC);
CREATE INDEX idx_cooccurrence_b ON public.card_cooccurrence (card_b_oracle_id, cooccurrence_count DESC);

ALTER TABLE public.card_cooccurrence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cooccurrence"
  ON public.card_cooccurrence FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage cooccurrence"
  ON public.card_cooccurrence FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Recommendation RPC
CREATE OR REPLACE FUNCTION public.get_card_recommendations(
  target_oracle_id text,
  result_limit integer DEFAULT 20,
  target_format text DEFAULT 'all'
)
RETURNS TABLE (
  oracle_id text,
  card_name text,
  cooccurrence_count integer,
  mana_cost text,
  type_line text,
  image_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.oracle_id,
    c.name AS card_name,
    co.cooccurrence_count,
    c.mana_cost,
    c.type_line,
    c.image_url
  FROM public.card_cooccurrence co
  INNER JOIN public.cards c
    ON c.oracle_id = CASE
      WHEN co.card_a_oracle_id = target_oracle_id THEN co.card_b_oracle_id
      ELSE co.card_a_oracle_id
    END
  WHERE (co.card_a_oracle_id = target_oracle_id OR co.card_b_oracle_id = target_oracle_id)
    AND co.format = target_format
  ORDER BY co.cooccurrence_count DESC
  LIMIT result_limit;
END;
$$;
