-- Keep failed feedback auditable without leaving exhausted items in the queue.
SELECT cron.unschedule('retry-failed-feedback');

SELECT cron.schedule(
  'retry-failed-feedback',
  '*/15 * * * *',
  $$
  UPDATE public.search_feedback
  SET processing_status = 'pending',
      retry_count = retry_count + 1
  WHERE processing_status = 'failed'
    AND retry_count < 3
    AND processed_at < now() - interval '10 minutes';

  UPDATE public.search_feedback
  SET processing_status = 'archived'
  WHERE processing_status = 'failed'
    AND retry_count >= 3;
  $$
);
