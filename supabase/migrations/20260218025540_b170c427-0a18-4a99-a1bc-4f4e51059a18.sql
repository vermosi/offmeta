-- Issue 1: Drop duplicate RLS policies on decks
DROP POLICY IF EXISTS "Public decks are viewable by everyone" ON public.decks;

-- Issue 1: Drop duplicate RLS policies on deck_cards
DROP POLICY IF EXISTS "Users can delete own deck cards" ON public.deck_cards;
DROP POLICY IF EXISTS "Users can update own deck cards" ON public.deck_cards;
DROP POLICY IF EXISTS "Users can view own deck cards" ON public.deck_cards;

-- Issue 4: Add unique constraint on (deck_id, card_name, board) to enable atomic upsert
ALTER TABLE public.deck_cards
  ADD CONSTRAINT deck_cards_deck_id_card_name_board_key
  UNIQUE (deck_id, card_name, board);