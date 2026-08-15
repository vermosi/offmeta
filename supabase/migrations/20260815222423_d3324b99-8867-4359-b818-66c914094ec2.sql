UPDATE public.error_events
SET status = 'repaired',
    last_fix_result = jsonb_build_object(
      'resolution', 'browser_noise',
      'note', 'Cross-origin script error / auth lock contention. Client now filters or re-fingerprints these.'
    ),
    last_fix_at = now()
WHERE status = 'open'
  AND (message ILIKE 'Script error.%' OR message ILIKE '%Lock broken by another request%');