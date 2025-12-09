-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'display_name');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- User decks table
CREATE TABLE public.decks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Deck',
  description TEXT,
  format TEXT NOT NULL DEFAULT 'commander',
  commander_id TEXT,
  commander_name TEXT,
  mainboard JSONB NOT NULL DEFAULT '[]'::jsonb,
  sideboard JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own decks" 
ON public.decks FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create their own decks" 
ON public.decks FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own decks" 
ON public.decks FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own decks" 
ON public.decks FOR DELETE USING (auth.uid() = user_id);

-- User collection table
CREATE TABLE public.collection_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  card_name TEXT NOT NULL,
  set_code TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  foil_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, card_id, set_code)
);

ALTER TABLE public.collection_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own collection" 
ON public.collection_cards FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their collection" 
ON public.collection_cards FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their collection" 
ON public.collection_cards FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from their collection" 
ON public.collection_cards FOR DELETE USING (auth.uid() = user_id);

-- Archetypes table (for brew recipes)
CREATE TABLE public.archetypes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  gameplan TEXT NOT NULL,
  color_identity TEXT[] NOT NULL DEFAULT '{}',
  format TEXT NOT NULL DEFAULT 'commander',
  off_meta_score INTEGER NOT NULL DEFAULT 50,
  budget_tier TEXT NOT NULL DEFAULT 'medium',
  core_cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  flex_cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_community BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.archetypes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view archetypes" 
ON public.archetypes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create archetypes" 
ON public.archetypes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- User archetype favorites
CREATE TABLE public.archetype_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  archetype_id UUID NOT NULL REFERENCES public.archetypes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, archetype_id)
);

ALTER TABLE public.archetype_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their favorites" 
ON public.archetype_favorites FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites" 
ON public.archetype_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove favorites" 
ON public.archetype_favorites FOR DELETE USING (auth.uid() = user_id);

-- Search history (optional for users)
CREATE TABLE public.search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  is_semantic BOOLEAN NOT NULL DEFAULT false,
  result_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their search history" 
ON public.search_history FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add to search history" 
ON public.search_history FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete search history" 
ON public.search_history FOR DELETE USING (auth.uid() = user_id);

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_decks_updated_at
  BEFORE UPDATE ON public.decks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collection_cards_updated_at
  BEFORE UPDATE ON public.collection_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_archetypes_updated_at
  BEFORE UPDATE ON public.archetypes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_decks_user_id ON public.decks(user_id);
CREATE INDEX idx_collection_cards_user_id ON public.collection_cards(user_id);
CREATE INDEX idx_collection_cards_card_name ON public.collection_cards(card_name);
CREATE INDEX idx_archetypes_color_identity ON public.archetypes USING GIN(color_identity);
CREATE INDEX idx_archetypes_tags ON public.archetypes USING GIN(tags);
CREATE INDEX idx_search_history_user_id ON public.search_history(user_id);