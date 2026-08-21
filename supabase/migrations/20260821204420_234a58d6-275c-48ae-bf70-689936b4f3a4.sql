-- Duplicate of idx_price_snapshots_card_recorded (same columns/order), only 15 scans vs 70k
DROP INDEX IF EXISTS public.idx_price_snapshots_card_name;

-- Weekly online index rebuild to reclaim bloat (CONCURRENTLY = no blocking locks)
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'reindex-price-snapshots';

SELECT cron.schedule(
  'reindex-price-snapshots',
  '30 4 * * 0',
  $$REINDEX TABLE CONCURRENTLY public.price_snapshots$$
);
