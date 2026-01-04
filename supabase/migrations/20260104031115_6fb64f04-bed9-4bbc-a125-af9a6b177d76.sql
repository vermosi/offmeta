-- Create table for search feedback
CREATE TABLE public.search_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_query TEXT NOT NULL,
  translated_query TEXT,
  issue_description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (public write, no read needed for users)
ALTER TABLE public.search_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedback (no auth required for feedback)
CREATE POLICY "Anyone can submit search feedback"
ON public.search_feedback
FOR INSERT
WITH CHECK (true);

-- No SELECT policy - feedback is for admin review only