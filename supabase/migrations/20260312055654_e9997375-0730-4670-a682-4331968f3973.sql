
-- Add new columns to card_cooccurrence
ALTER TABLE public.card_cooccurrence
  ADD COLUMN relationship_type text NOT NULL DEFAULT 'co_played',
  ADD COLUMN weight numeric NOT NULL DEFAULT 0,
  ADD COLUMN source text DEFAULT 'community_decks',
  ADD COLUMN context jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

-- Create card_signals table
CREATE TABLE public.card_signals (
  card_id text PRIMARY KEY,
  search_count integer NOT NULL DEFAULT 0,
  click_count integer NOT NULL DEFAULT 0,
  save_count integer NOT NULL DEFAULT 0,
  deck_count integer NOT NULL DEFAULT 0,
  synergy_score numeric NOT NULL DEFAULT 0,
  trend_score numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.card_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read card signals" ON public.card_signals FOR SELECT TO public USING (true);
CREATE POLICY "Service role can manage card signals" ON public.card_signals FOR ALL TO public USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Populate card_signals with deck counts
INSERT INTO public.card_signals (card_id, deck_count, updated_at)
SELECT
  cdc.scryfall_oracle_id,
  COUNT(DISTINCT cdc.deck_id)::integer,
  now()
FROM public.community_deck_cards cdc
WHERE cdc.scryfall_oracle_id IS NOT NULL
GROUP BY cdc.scryfall_oracle_id;

-- Backfill PMI-normalized weights
UPDATE public.card_cooccurrence co
SET
  weight = LEAST(
    co.cooccurrence_count::numeric / GREATEST(SQRT(sa.deck_count::numeric * sb.deck_count::numeric), 1),
    1
  ),
  context = jsonb_build_object('deck_count_a', sa.deck_count, 'deck_count_b', sb.deck_count)
FROM public.card_signals sa, public.card_signals sb
WHERE sa.card_id = co.card_a_oracle_id
  AND sb.card_id = co.card_b_oracle_id;

-- Indexes
CREATE INDEX idx_card_cooccurrence_weight ON public.card_cooccurrence(weight DESC);
CREATE INDEX idx_card_cooccurrence_type ON public.card_cooccurrence(relationship_type);
