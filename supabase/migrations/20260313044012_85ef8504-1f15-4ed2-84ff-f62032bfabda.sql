
-- Price alerts table
CREATE TABLE public.price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  card_name text NOT NULL,
  scryfall_id text,
  target_price numeric NOT NULL,
  direction text NOT NULL DEFAULT 'below',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  triggered_at timestamptz
);

-- User notifications table
CREATE TABLE public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'price_alert',
  title text NOT NULL,
  body text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- RLS on price_alerts
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts"
  ON public.price_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own alerts"
  ON public.price_alerts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON public.price_alerts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
  ON public.price_alerts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages alerts"
  ON public.price_alerts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS on user_notifications
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.user_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.user_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.user_notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages notifications"
  ON public.user_notifications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Validation trigger for price_alerts
CREATE OR REPLACE FUNCTION public.validate_price_alert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF length(NEW.card_name) > 200 THEN
    RAISE EXCEPTION 'Card name exceeds 200 character limit';
  END IF;
  IF NEW.target_price <= 0 OR NEW.target_price > 99999 THEN
    RAISE EXCEPTION 'Target price must be between 0.01 and 99999';
  END IF;
  IF NEW.direction NOT IN ('below', 'above') THEN
    RAISE EXCEPTION 'Direction must be below or above';
  END IF;
  -- Max 50 active alerts per user
  IF TG_OP = 'INSERT' THEN
    IF (SELECT count(*) FROM public.price_alerts WHERE user_id = NEW.user_id AND is_active = true) >= 50 THEN
      RAISE EXCEPTION 'Maximum 50 active price alerts per user';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_price_alert
  BEFORE INSERT OR UPDATE ON public.price_alerts
  FOR EACH ROW EXECUTE FUNCTION public.validate_price_alert();

-- Indexes
CREATE INDEX idx_price_alerts_user_active ON public.price_alerts (user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_price_alerts_card ON public.price_alerts (card_name) WHERE is_active = true;
CREATE INDEX idx_user_notifications_user ON public.user_notifications (user_id, read, created_at DESC);
