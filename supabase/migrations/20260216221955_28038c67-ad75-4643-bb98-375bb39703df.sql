-- Enable realtime for analytics-relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.translation_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_events;