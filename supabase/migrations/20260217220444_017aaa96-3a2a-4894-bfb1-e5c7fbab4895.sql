
-- Create decks table
CREATE TABLE public.decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled Deck',
  format text NOT NULL DEFAULT 'commander',
  commander_name text,
  companion_name text,
  color_identity text[] NOT NULL DEFAULT '{}',
  description text,
  is_public boolean NOT NULL DEFAULT false,
  card_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create deck_cards table
CREATE TABLE public.deck_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  card_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  board text NOT NULL DEFAULT 'mainboard',
  category text,
  is_commander boolean NOT NULL DEFAULT false,
  is_companion boolean NOT NULL DEFAULT false,
  scryfall_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_decks_user_id ON public.decks(user_id);
CREATE INDEX idx_deck_cards_deck_id ON public.deck_cards(deck_id);
CREATE INDEX idx_decks_is_public ON public.decks(is_public) WHERE is_public = true;

-- Enable RLS
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deck_cards ENABLE ROW LEVEL SECURITY;

-- Decks RLS: owners can CRUD their own decks
CREATE POLICY "Users can view own decks"
  ON public.decks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own decks"
  ON public.decks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own decks"
  ON public.decks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own decks"
  ON public.decks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Public decks readable by anyone
CREATE POLICY "Anyone can view public decks"
  ON public.decks FOR SELECT
  USING (is_public = true);

-- Deck cards RLS: users can CRUD cards in their own decks
CREATE POLICY "Users can view cards in own decks"
  ON public.deck_cards FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.decks WHERE decks.id = deck_cards.deck_id AND decks.user_id = auth.uid()));

CREATE POLICY "Users can add cards to own decks"
  ON public.deck_cards FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.decks WHERE decks.id = deck_cards.deck_id AND decks.user_id = auth.uid()));

CREATE POLICY "Users can update cards in own decks"
  ON public.deck_cards FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.decks WHERE decks.id = deck_cards.deck_id AND decks.user_id = auth.uid()));

CREATE POLICY "Users can delete cards from own decks"
  ON public.deck_cards FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.decks WHERE decks.id = deck_cards.deck_id AND decks.user_id = auth.uid()));

-- Public deck cards readable by anyone
CREATE POLICY "Anyone can view cards in public decks"
  ON public.deck_cards FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.decks WHERE decks.id = deck_cards.deck_id AND decks.is_public = true));

-- Trigger for updated_at on decks
CREATE TRIGGER update_decks_updated_at
  BEFORE UPDATE ON public.decks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-update card_count on deck_cards changes
CREATE OR REPLACE FUNCTION public.update_deck_card_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.decks SET card_count = (
      SELECT COALESCE(SUM(quantity), 0) FROM public.deck_cards WHERE deck_id = OLD.deck_id
    ) WHERE id = OLD.deck_id;
    RETURN OLD;
  ELSE
    UPDATE public.decks SET card_count = (
      SELECT COALESCE(SUM(quantity), 0) FROM public.deck_cards WHERE deck_id = NEW.deck_id
    ) WHERE id = NEW.deck_id;
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER update_deck_card_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.deck_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_deck_card_count();
