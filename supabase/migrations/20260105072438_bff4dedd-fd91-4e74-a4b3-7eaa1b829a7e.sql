-- Create analytics_events table for tracking user interactions
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'search', 'card_click', 'card_modal_view', 'affiliate_click', 'pagination'
  event_data JSONB NOT NULL DEFAULT '{}',
  session_id TEXT, -- Optional anonymous session tracking
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_session ON public.analytics_events(session_id) WHERE session_id IS NOT NULL;

-- Enable RLS but allow anonymous inserts (public analytics)
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert analytics (anonymous tracking)
CREATE POLICY "Anyone can insert analytics events"
ON public.analytics_events
FOR INSERT
WITH CHECK (true);

-- Only allow reading via authenticated admin (you can adjust this later)
-- For now, no SELECT policy means data is write-only from the client
