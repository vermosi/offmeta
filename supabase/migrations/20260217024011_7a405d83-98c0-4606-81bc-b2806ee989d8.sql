-- Add unique constraint on translation_rules.pattern for upsert support
-- This enables auto-seeding AI translations into the pattern match layer
CREATE UNIQUE INDEX IF NOT EXISTS translation_rules_pattern_unique ON public.translation_rules (pattern);
