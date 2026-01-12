-- Create translation_logs table for tracking query translation quality
CREATE TABLE public.translation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  natural_language_query TEXT NOT NULL,
  translated_query TEXT NOT NULL,
  model_used TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash-lite',
  confidence_score NUMERIC(3,2),
  response_time_ms INTEGER,
  validation_issues TEXT[],
  quality_flags TEXT[],
  filters_applied JSONB,
  fallback_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.translation_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write (internal logging only)
CREATE POLICY "Only service role can insert translation logs"
ON public.translation_logs
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Only service role can read translation logs"
ON public.translation_logs
FOR SELECT
USING (false);

-- Add index for time-based queries
CREATE INDEX idx_translation_logs_created_at ON public.translation_logs(created_at DESC);

-- Add index for quality analysis
CREATE INDEX idx_translation_logs_confidence ON public.translation_logs(confidence_score);