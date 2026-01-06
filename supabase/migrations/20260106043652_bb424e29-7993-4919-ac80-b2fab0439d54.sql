-- Add a public_id for sharing decks without exposing internal user_id
ALTER TABLE public.decks 
ADD COLUMN public_id text UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex');

-- Create an index for efficient lookups by public_id
CREATE INDEX idx_decks_public_id ON public.decks(public_id) WHERE is_public = true;

-- Update existing rows to have a public_id
UPDATE public.decks SET public_id = encode(gen_random_bytes(8), 'hex') WHERE public_id IS NULL;