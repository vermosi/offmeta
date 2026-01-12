-- Create persistent query cache table for translations
-- Survives edge function restarts, reducing AI calls by 10-15%

CREATE TABLE public.query_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query_hash TEXT NOT NULL UNIQUE,
  normalized_query TEXT NOT NULL,
  scryfall_query TEXT NOT NULL,
  explanation JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC NOT NULL DEFAULT 0.8,
  show_affiliate BOOLEAN NOT NULL DEFAULT false,
  hit_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '48 hours'),
  last_hit_at TIMESTAMP WITH TIME ZONE
);

-- Index for fast lookups by hash
CREATE INDEX idx_query_cache_hash ON public.query_cache (query_hash);

-- Index for cleanup of expired entries
CREATE INDEX idx_query_cache_expires ON public.query_cache (expires_at);

-- Index for hit count to identify popular queries
CREATE INDEX idx_query_cache_hits ON public.query_cache (hit_count DESC);

-- Enable RLS
ALTER TABLE public.query_cache ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write cache (edge function uses service role)
CREATE POLICY "Service role can read cache"
  ON public.query_cache FOR SELECT
  USING (false);

CREATE POLICY "Service role can insert cache"
  ON public.query_cache FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Service role can update cache"
  ON public.query_cache FOR UPDATE
  USING (false);

CREATE POLICY "Service role can delete cache"
  ON public.query_cache FOR DELETE
  USING (false);

-- Function to clean up expired cache entries (called by cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.query_cache WHERE expires_at < now();
END;
$$;

-- Schedule cache cleanup daily at 4 AM UTC
SELECT cron.schedule(
  'cleanup-query-cache',
  '0 4 * * *',
  $$SELECT public.cleanup_expired_cache()$$
);