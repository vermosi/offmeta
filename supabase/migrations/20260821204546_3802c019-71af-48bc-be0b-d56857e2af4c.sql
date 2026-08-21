-- 1. Configurable retention policies
CREATE TABLE IF NOT EXISTS public.retention_policies (
  policy_key text PRIMARY KEY,
  retention_days integer NOT NULL CHECK (retention_days > 0),
  compact_after_days integer CHECK (compact_after_days > 0),
  enabled boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.retention_policies TO authenticated;
GRANT ALL ON public.retention_policies TO service_role;

ALTER TABLE public.retention_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read retention policies" ON public.retention_policies;
CREATE POLICY "Admins can read retention policies"
  ON public.retention_policies FOR SELECT TO authenticated
  USING (public.has_role('admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can manage retention policies" ON public.retention_policies;
CREATE POLICY "Admins can manage retention policies"
  ON public.retention_policies FOR ALL TO authenticated
  USING (public.has_role('admin'::public.app_role))
  WITH CHECK (public.has_role('admin'::public.app_role));

DROP TRIGGER IF EXISTS update_retention_policies_updated_at ON public.retention_policies;
CREATE TRIGGER update_retention_policies_updated_at
  BEFORE UPDATE ON public.retention_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.retention_policies (policy_key, retention_days, compact_after_days, description)
VALUES ('price_snapshots', 90, 14, 'Price history: delete beyond retention_days, keep one row per card/source/day beyond compact_after_days')
ON CONFLICT (policy_key) DO NOTHING;

-- 2. Batched, configurable prune + compaction
DROP FUNCTION IF EXISTS public.prune_old_price_snapshots();

CREATE OR REPLACE FUNCTION public.prune_old_price_snapshots(
  p_retention_days integer DEFAULT NULL,
  p_max_batches integer DEFAULT 100,
  p_batch_size integer DEFAULT 20000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '600s'
AS $function$
DECLARE
  v_policy public.retention_policies%ROWTYPE;
  v_retention_days integer;
  v_compact_after integer;
  v_deleted bigint := 0;
  v_compacted bigint := 0;
  v_batch bigint;
  i integer;
BEGIN
  SELECT * INTO v_policy FROM public.retention_policies WHERE policy_key = 'price_snapshots';

  IF v_policy.policy_key IS NOT NULL AND NOT v_policy.enabled AND p_retention_days IS NULL THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'policy disabled');
  END IF;

  v_retention_days := COALESCE(p_retention_days, v_policy.retention_days, 90);
  v_compact_after := v_policy.compact_after_days;

  -- Delete rows beyond the retention window, in batches
  FOR i IN 1..GREATEST(p_max_batches, 1) LOOP
    WITH doomed AS (
      SELECT id FROM public.price_snapshots
      WHERE recorded_at < now() - make_interval(days => v_retention_days)
      LIMIT p_batch_size
    )
    DELETE FROM public.price_snapshots p USING doomed d WHERE p.id = d.id;
    GET DIAGNOSTICS v_batch = ROW_COUNT;
    v_deleted := v_deleted + v_batch;
    EXIT WHEN v_batch = 0;
  END LOOP;

  -- Compact older-but-retained rows to one snapshot per card/source/day
  IF v_compact_after IS NOT NULL THEN
    FOR i IN 1..GREATEST(p_max_batches, 1) LOOP
      WITH dupes AS (
        SELECT id FROM (
          SELECT id,
                 row_number() OVER (
                   PARTITION BY card_name, source, date_trunc('day', recorded_at)
                   ORDER BY recorded_at DESC
                 ) AS rn
          FROM public.price_snapshots
          WHERE recorded_at < now() - make_interval(days => v_compact_after)
            AND recorded_at >= now() - make_interval(days => v_retention_days)
        ) ranked
        WHERE rn > 1
        LIMIT p_batch_size
      )
      DELETE FROM public.price_snapshots p USING dupes d WHERE p.id = d.id;
      GET DIAGNOSTICS v_batch = ROW_COUNT;
      v_compacted := v_compacted + v_batch;
      EXIT WHEN v_batch = 0;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'retention_days', v_retention_days,
    'compact_after_days', v_compact_after,
    'deleted', v_deleted,
    'compacted', v_compacted
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.prune_old_price_snapshots(integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_old_price_snapshots(integer, integer, integer) TO service_role;

-- 3. Nightly schedule (replaces the weekly job), followed by a summary refresh
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('prune-price-snapshots-weekly','prune-price-snapshots-nightly');

SELECT cron.schedule(
  'prune-price-snapshots-nightly',
  '10 3 * * *',
  $$SELECT public.prune_old_price_snapshots(); SELECT public.refresh_price_mover_stats();$$
);
