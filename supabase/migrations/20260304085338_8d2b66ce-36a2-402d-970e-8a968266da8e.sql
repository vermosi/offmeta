ALTER TABLE public.translation_logs
  ADD COLUMN IF NOT EXISTS pre_translation_attempted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pre_translation_skipped_reason text;