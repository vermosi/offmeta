-- Create table for scraped deck data from external sources
CREATE TABLE public.scraped_decks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL, -- 'edhtop16', 'mtggoldfish', 'mtgtop8', 'aetherhub', 'cedh'
  source_url TEXT,
  source_deck_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  format TEXT NOT NULL DEFAULT 'commander',
  color_identity TEXT[] NOT NULL DEFAULT '{}',
  commander_name TEXT,
  
  -- Deck content
  mainboard JSONB NOT NULL DEFAULT '[]',
  sideboard JSONB NOT NULL DEFAULT '[]',
  
  -- Metadata
  budget_tier TEXT NOT NULL DEFAULT 'medium', -- 'budget', 'medium', 'expensive'
  estimated_price DECIMAL(10, 2),
  win_rate DECIMAL(5, 2),
  popularity_score INTEGER DEFAULT 0,
  tournament_results JSONB DEFAULT '{}',
  
  -- Tags and categorization
  archetype TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  strategy_notes TEXT,
  
  -- Timestamps
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint per source
  CONSTRAINT unique_source_deck UNIQUE (source, source_deck_id)
);

-- Enable RLS
ALTER TABLE public.scraped_decks ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read scraped decks (public data)
CREATE POLICY "Anyone can view scraped decks"
  ON public.scraped_decks FOR SELECT
  USING (true);

-- Only system can insert/update (via edge function with service role)
-- No user-level insert/update/delete policies needed

-- Create index for common queries
CREATE INDEX idx_scraped_decks_format ON public.scraped_decks(format);
CREATE INDEX idx_scraped_decks_color ON public.scraped_decks USING GIN(color_identity);
CREATE INDEX idx_scraped_decks_budget ON public.scraped_decks(budget_tier);
CREATE INDEX idx_scraped_decks_source ON public.scraped_decks(source);
CREATE INDEX idx_scraped_decks_popularity ON public.scraped_decks(popularity_score DESC);

-- Add updated_at trigger
CREATE TRIGGER update_scraped_decks_updated_at
  BEFORE UPDATE ON public.scraped_decks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();