-- Enable Realtime for query_cache table to support cross-client cache sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.query_cache;