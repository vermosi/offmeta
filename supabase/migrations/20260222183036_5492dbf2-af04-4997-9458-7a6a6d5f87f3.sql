
-- Collection cards table
CREATE TABLE public.collection_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  card_name text NOT NULL,
  scryfall_id text,
  quantity integer NOT NULL DEFAULT 1,
  foil boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint
ALTER TABLE public.collection_cards
  ADD CONSTRAINT collection_cards_unique UNIQUE (user_id, card_name, scryfall_id, foil);

-- Enable RLS
ALTER TABLE public.collection_cards ENABLE ROW LEVEL SECURITY;

-- RLS policies (all user-only)
CREATE POLICY "Users can view own collection"
  ON public.collection_cards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to own collection"
  ON public.collection_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collection"
  ON public.collection_cards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from own collection"
  ON public.collection_cards FOR DELETE
  USING (auth.uid() = user_id);

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_collection_card()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.quantity < 1 OR NEW.quantity > 999 THEN
    RAISE EXCEPTION 'Quantity must be between 1 and 999';
  END IF;
  IF length(NEW.card_name) > 200 THEN
    RAISE EXCEPTION 'Card name exceeds 200 character limit';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF (SELECT count(*) FROM public.collection_cards WHERE user_id = NEW.user_id) >= 50000 THEN
      RAISE EXCEPTION 'Maximum 50000 cards per collection';
    END IF;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_collection_card_trigger
  BEFORE INSERT OR UPDATE ON public.collection_cards
  FOR EACH ROW EXECUTE FUNCTION public.validate_collection_card();

-- Indexes
CREATE INDEX idx_collection_user_id ON public.collection_cards(user_id);
CREATE INDEX idx_collection_user_card ON public.collection_cards(user_id, card_name);
