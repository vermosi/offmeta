INSERT INTO public.translation_rules (pattern, scryfall_syntax, description, confidence, is_active, auto_generated, verification_state, last_verified_at, verified_result_count)
VALUES (
  'mana burn',
  'o:"unspent mana" game:paper',
  'Mana burn: cards that care about unspent mana in a player''s mana pool (e.g. Yurlok of Scorch Thrash, which makes players lose life for unspent mana).',
  0.90,
  true,
  false,
  'verified',
  now(),
  13
)
ON CONFLICT DO NOTHING;

UPDATE public.search_feedback
SET processing_status = 'completed',
    processed_at = now(),
    scryfall_validation_count = 13
WHERE id = 'c017d1af-9a29-4ff6-9a5f-1453f7c015fe';