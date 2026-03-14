-- 1. Prune price snapshots older than 90 days
CREATE OR REPLACE FUNCTION public.prune_old_price_snapshots()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.price_snapshots
  WHERE recorded_at < now() - interval '90 days';
END;
$$;

-- 2. Check price alerts against latest snapshots and generate notifications
CREATE OR REPLACE FUNCTION public.check_price_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  alert_row RECORD;
  current_price numeric;
BEGIN
  FOR alert_row IN
    SELECT pa.id, pa.user_id, pa.card_name, pa.target_price, pa.direction
    FROM public.price_alerts pa
    WHERE pa.is_active = true
  LOOP
    SELECT ps.price_usd INTO current_price
    FROM public.price_snapshots ps
    WHERE ps.card_name = alert_row.card_name
      AND ps.price_usd IS NOT NULL
    ORDER BY ps.recorded_at DESC
    LIMIT 1;

    IF current_price IS NULL THEN
      CONTINUE;
    END IF;

    IF (alert_row.direction = 'below' AND current_price <= alert_row.target_price)
       OR (alert_row.direction = 'above' AND current_price >= alert_row.target_price)
    THEN
      INSERT INTO public.user_notifications (user_id, type, title, body, metadata)
      VALUES (
        alert_row.user_id,
        'price_alert',
        alert_row.card_name || ' price alert triggered',
        alert_row.card_name || ' is now $' || current_price::text ||
          CASE alert_row.direction
            WHEN 'below' THEN ' (target: ≤$' || alert_row.target_price::text || ')'
            ELSE ' (target: ≥$' || alert_row.target_price::text || ')'
          END,
        jsonb_build_object(
          'card_name', alert_row.card_name,
          'current_price', current_price,
          'target_price', alert_row.target_price,
          'direction', alert_row.direction
        )
      );

      UPDATE public.price_alerts
      SET is_active = false, triggered_at = now()
      WHERE id = alert_row.id;
    END IF;
  END LOOP;
END;
$$;