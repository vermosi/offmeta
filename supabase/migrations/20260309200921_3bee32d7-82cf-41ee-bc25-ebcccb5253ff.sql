-- Add macro archetype category and specific deck name to community_decks
ALTER TABLE public.community_decks 
  ADD COLUMN IF NOT EXISTS macro_archetype text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deck_name text DEFAULT NULL;

-- Create archetype snapshots table for trend tracking
CREATE TABLE IF NOT EXISTS public.archetype_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  format text NOT NULL,
  macro_archetype text NOT NULL,
  deck_name text NOT NULL,
  deck_count integer NOT NULL DEFAULT 0,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(format, deck_name, snapshot_date)
);

ALTER TABLE public.archetype_snapshots ENABLE ROW LEVEL SECURITY;

-- Public read, service role write
CREATE POLICY "Anyone can read archetype snapshots"
  ON public.archetype_snapshots FOR SELECT TO public
  USING (true);

CREATE POLICY "Service role can manage archetype snapshots"
  ON public.archetype_snapshots FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Index for efficient trend queries
CREATE INDEX IF NOT EXISTS idx_archetype_snapshots_lookup 
  ON public.archetype_snapshots(format, deck_name, snapshot_date DESC);

-- Index on community_decks for the new columns
CREATE INDEX IF NOT EXISTS idx_community_decks_macro_archetype 
  ON public.community_decks(macro_archetype) WHERE macro_archetype IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_community_decks_deck_name
  ON public.community_decks(deck_name) WHERE deck_name IS NOT NULL;