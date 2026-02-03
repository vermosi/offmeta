-- ===========================
-- Semantic Search Pipeline Enhancement
-- Adds pgvector support and extends translation_rules for concept library
-- ===========================

-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add new columns to translation_rules for concept library functionality
ALTER TABLE public.translation_rules 
  ADD COLUMN IF NOT EXISTS concept_id text,
  ADD COLUMN IF NOT EXISTS aliases text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS scryfall_templates text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS negative_templates text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS examples text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS priority integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index for concept lookups
CREATE INDEX IF NOT EXISTS idx_translation_rules_concept_id 
  ON public.translation_rules(concept_id) 
  WHERE concept_id IS NOT NULL;

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_translation_rules_category 
  ON public.translation_rules(category);

-- Create vector similarity search index (IVFFlat for performance)
CREATE INDEX IF NOT EXISTS idx_translation_rules_embedding 
  ON public.translation_rules 
  USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 20);

-- Add GIN index for aliases array search
CREATE INDEX IF NOT EXISTS idx_translation_rules_aliases 
  ON public.translation_rules 
  USING GIN(aliases);

-- Create function to find concepts by vector similarity
CREATE OR REPLACE FUNCTION public.match_concepts(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE(
  id uuid,
  concept_id text,
  pattern text,
  scryfall_syntax text,
  scryfall_templates text[],
  negative_templates text[],
  description text,
  confidence numeric,
  category text,
  priority integer,
  similarity float
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    tr.id,
    tr.concept_id,
    tr.pattern,
    tr.scryfall_syntax,
    tr.scryfall_templates,
    tr.negative_templates,
    tr.description,
    tr.confidence,
    tr.category,
    tr.priority,
    1 - (tr.embedding <=> query_embedding) as similarity
  FROM public.translation_rules tr
  WHERE tr.is_active = true
    AND tr.embedding IS NOT NULL
    AND 1 - (tr.embedding <=> query_embedding) > match_threshold
  ORDER BY tr.embedding <=> query_embedding, tr.priority DESC
  LIMIT match_count;
$$;

-- Create function to find concepts by alias text search
CREATE OR REPLACE FUNCTION public.match_concepts_by_alias(
  search_term text,
  match_count int DEFAULT 5
)
RETURNS TABLE(
  id uuid,
  concept_id text,
  pattern text,
  scryfall_syntax text,
  scryfall_templates text[],
  negative_templates text[],
  description text,
  confidence numeric,
  category text,
  priority integer
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    tr.id,
    tr.concept_id,
    tr.pattern,
    tr.scryfall_syntax,
    tr.scryfall_templates,
    tr.negative_templates,
    tr.description,
    tr.confidence,
    tr.category,
    tr.priority
  FROM public.translation_rules tr
  WHERE tr.is_active = true
    AND (
      lower(search_term) = ANY(tr.aliases)
      OR tr.pattern ILIKE '%' || search_term || '%'
      OR tr.concept_id ILIKE '%' || search_term || '%'
    )
  ORDER BY 
    CASE WHEN lower(search_term) = ANY(tr.aliases) THEN 0 ELSE 1 END,
    tr.priority DESC,
    tr.confidence DESC
  LIMIT match_count;
$$;

-- Create table for storing slot extraction patterns (deterministic rules)
CREATE TABLE IF NOT EXISTS public.slot_patterns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_type text NOT NULL, -- 'format', 'color', 'type', 'mv', 'negation', 'price', 'year'
  pattern text NOT NULL, -- regex pattern to match
  extraction_key text NOT NULL, -- what gets extracted (e.g., 'commander', 'gu', '<=3')
  priority integer DEFAULT 50,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on slot_patterns
ALTER TABLE public.slot_patterns ENABLE ROW LEVEL SECURITY;

-- Service role can manage slot patterns
CREATE POLICY "Service role can manage slot patterns"
  ON public.slot_patterns
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Create index for slot type lookups
CREATE INDEX IF NOT EXISTS idx_slot_patterns_type 
  ON public.slot_patterns(slot_type) 
  WHERE is_active = true;

-- Create table for query repair history (debugging/analytics)
CREATE TABLE IF NOT EXISTS public.query_repairs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_query text NOT NULL,
  repaired_query text NOT NULL,
  repair_steps text[] NOT NULL DEFAULT '{}',
  scryfall_error text,
  success boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on query_repairs
ALTER TABLE public.query_repairs ENABLE ROW LEVEL SECURITY;

-- Service role can manage query repairs
CREATE POLICY "Service role can insert query repairs"
  ON public.query_repairs
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Service role can read query repairs"
  ON public.query_repairs
  FOR SELECT
  USING (false);

-- Add comment explaining the concept library approach
COMMENT ON COLUMN public.translation_rules.concept_id IS 'Unique identifier for the concept (e.g., "ramp", "board_wipe", "blink")';
COMMENT ON COLUMN public.translation_rules.aliases IS 'Alternative phrases that map to this concept (e.g., ["mana rock", "fast mana", "artifact ramp"])';
COMMENT ON COLUMN public.translation_rules.scryfall_templates IS 'Array of Scryfall query templates for this concept';
COMMENT ON COLUMN public.translation_rules.negative_templates IS 'Templates to exclude false positives';
COMMENT ON COLUMN public.translation_rules.embedding IS '1536-dimension vector embedding for semantic similarity search';
COMMENT ON COLUMN public.translation_rules.category IS 'Category for grouping (e.g., "ramp", "removal", "draw", "slang")';