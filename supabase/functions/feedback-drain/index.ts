/**
 * Feedback Drain Edge Function
 *
 * Anonymous users can submit search feedback but cannot invoke
 * `process-feedback` (it requires auth to prevent AI cost abuse), so their rows
 * sit at `pending` forever. This job drains that queue on a schedule:
 * it picks the oldest pending items, bounded per run, and calls
 * `process-feedback` once per item with the service-role key.
 *
 * Safety: single-flight job lease, hard batch cap, sequential calls, and a
 * circuit breaker that stops the run on gateway 402/403 or repeated 429s.
 *
 * @module feedback-drain
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/auth.ts';
import { validateEnv } from '../_shared/env.ts';
import { createLogger, withLogging } from '../_shared/logger.ts';
import {
  applyJobRateLimit,
  requirePipelineOrAdminJob,
} from '../_shared/jobGuards.ts';
import { acquireJobLock, lockBusyResponse } from '../_shared/jobLock.ts';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = validateEnv([
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
]);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const logger = createLogger('feedback-drain');

const JOB_NAME = 'feedback-drain';
/** Hard cap on AI-backed calls per run. */
const MAX_BATCH = 5;
/** Pause between items so we never burst the AI gateway. */
const ITEM_DELAY_MS = 750;
/** Stop the run after this many consecutive rate-limit responses. */
const MAX_RATE_LIMITED = 2;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

serve(
  withLogging(JOB_NAME, async (req) => {
    const corsHeaders = getCorsHeaders(req);
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const auth = await requirePipelineOrAdminJob(req);
    if (!auth.authorized) return auth.response;

    const rateLimit = await applyJobRateLimit(req, corsHeaders, {
      skip: auth.viaPipeline,
      bucketSize: 2,
      globalLimit: 20,
      label: 'Feedback drain',
    });
    if (!rateLimit.allowed) return rateLimit.response;

    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    const lease = await acquireJobLock(JOB_NAME, 300);
    if (!lease.acquired) {
      return lockBusyResponse(JOB_NAME, {
        ...corsHeaders,
        'Content-Type': 'application/json',
      });
    }

    const startedAt = Date.now();
    try {
      // Oldest first so nothing starves. `failed` rows are left alone: they are
      // retried explicitly from the admin panel, not automatically.
      const { data: pending, error } = await supabase
        .from('search_feedback')
        .select('id')
        .eq('processing_status', 'pending')
        .order('created_at', { ascending: true })
        .limit(MAX_BATCH);

      if (error) throw new Error(`Failed to load queue: ${error.message}`);

      const items = pending ?? [];
      if (items.length === 0) {
        logger.info('feedback_drain_idle');
        return json({ success: true, processed: 0, remaining: 0, idle: true });
      }

      let processed = 0;
      let failed = 0;
      let rateLimited = 0;
      let halted: string | null = null;

      for (const item of items) {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/process-feedback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ feedbackId: item.id }),
        });

        if (res.ok) {
          processed += 1;
          rateLimited = 0;
        } else if (res.status === 429) {
          rateLimited += 1;
          logger.warn('feedback_drain_rate_limited', { feedbackId: item.id });
          if (rateLimited >= MAX_RATE_LIMITED) {
            // Transient: the next scheduled run picks up where we stopped.
            halted = 'rate_limited';
            break;
          }
          await sleep(2000);
          continue;
        } else if (res.status === 402 || res.status === 403) {
          // Terminal for this run: credits exhausted or AI blocked.
          halted = res.status === 402 ? 'payment_required' : 'forbidden';
          logger.error('feedback_drain_halted', {
            status: res.status,
            body: (await res.text()).slice(0, 500),
          });
          break;
        } else {
          failed += 1;
          logger.error('feedback_drain_item_failed', {
            feedbackId: item.id,
            status: res.status,
            body: (await res.text()).slice(0, 500),
          });
        }

        await sleep(ITEM_DELAY_MS);
      }

      const { count: remaining } = await supabase
        .from('search_feedback')
        .select('id', { count: 'exact', head: true })
        .eq('processing_status', 'pending');

      logger.info('feedback_drain_complete', {
        processed,
        failed,
        halted,
        remaining: remaining ?? 0,
        durationMs: Date.now() - startedAt,
      });

      return json({
        success: true,
        processed,
        failed,
        halted,
        remaining: remaining ?? 0,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('feedback_drain_error', { message });
      return json({ success: false, error: message }, 500);
    } finally {
      await lease.release();
    }
  }),
);
