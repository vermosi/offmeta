
-- SECURITY DEFINER function to expose only aggregate collection stats publicly
-- Individual card rows remain private via existing RLS
CREATE OR REPLACE FUNCTION public.get_public_collection_stats(target_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'unique_cards', COUNT(DISTINCT card_name),
    'total_cards', COALESCE(SUM(quantity), 0),
    'estimated_value', COALESCE(
      (SELECT ROUND(SUM(
        CASE WHEN cc.foil THEN COALESCE(ps.price_usd_foil, ps.price_usd, 0)
             ELSE COALESCE(ps.price_usd, 0)
        END * cc.quantity
      )::numeric, 2)
      FROM collection_cards cc
      LEFT JOIN LATERAL (
        SELECT p.price_usd, p.price_usd_foil
        FROM price_snapshots p
        WHERE p.card_name = cc.card_name
        ORDER BY p.recorded_at DESC
        LIMIT 1
      ) ps ON true
      WHERE cc.user_id = target_user_id
    ), 0)
  )
  FROM collection_cards
  WHERE user_id = target_user_id;
$$;
