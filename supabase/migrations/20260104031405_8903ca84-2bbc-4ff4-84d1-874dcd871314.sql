-- Create table for dynamic translation rules learned from feedback
CREATE TABLE public.translation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern TEXT NOT NULL,
  scryfall_syntax TEXT NOT NULL,
  description TEXT,
  source_feedback_id UUID REFERENCES public.search_feedback(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  confidence NUMERIC(3,2) DEFAULT 0.8,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (read-only for functions, no user access needed)
ALTER TABLE public.translation_rules ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage rules (edge functions use service role)
CREATE POLICY "Service role can manage translation rules"
ON public.translation_rules
FOR ALL
USING (true)
WITH CHECK (true);

-- Add status column to search_feedback to track processing
ALTER TABLE public.search_feedback 
ADD COLUMN processing_status TEXT DEFAULT 'pending',
ADD COLUMN processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN generated_rule_id UUID REFERENCES public.translation_rules(id);