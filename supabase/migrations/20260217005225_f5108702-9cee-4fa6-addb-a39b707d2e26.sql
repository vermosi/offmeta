-- Add filters_snapshot column to saved_searches
ALTER TABLE public.saved_searches
ADD COLUMN IF NOT EXISTS filters_snapshot jsonb DEFAULT NULL;

-- Allow users to update their own saved searches (for inline label editing + filters)
CREATE POLICY "Users can update own saved searches"
ON public.saved_searches
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);