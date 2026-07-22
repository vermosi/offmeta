/**
 * Cleanup Logs Edge Function
 *
 * Deletes translation_logs older than 30 days to prevent database bloat.
 * Should be called via cron job or manual trigger.
 * Requires admin role.
 *
 * @module cleanup-logs
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/auth.ts';
import { validateEnv } from '../_shared/env.ts';
import { createLogger, withLogging } from '../_shared/logger.ts';
import { applyJobRateLimit, requireAdminJob } from '../_shared/jobGuards.ts';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = validateEnv([
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
]);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const logger = createLogger('cleanup-logs');

const RETENTION_DAYS = 30;

serve(withLogging('cleanup-logs', async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  const adminCheck = await requireAdminJob(req);
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  const rateLimit = await applyJobRateLimit(req, corsHeaders, {
    bucketSize: 1,
    globalLimit: 10,
    label: 'Cleanup job',
  });
  if (!rateLimit.allowed) {
    return rateLimit.response;
  }

  const startTime = Date.now();

  try {
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    logger.info('cleanup_started', { cutoffDate: cutoffDate.toISOString() });

    // Delete old translation logs
    const { error: logsError, count: logsCount } = await supabase
      .from('translation_logs')
      .delete({ count: 'exact' })
      .lt('created_at', cutoffDate.toISOString());

    if (logsError) {
      throw new Error(
        `Failed to delete translation_logs: ${logsError.message}`,
      );
    }

    // Also clean up old analytics events (same retention period)
    const { error: analyticsError, count: analyticsCount } = await supabase
      .from('analytics_events')
      .delete({ count: 'exact' })
      .lt('created_at', cutoffDate.toISOString());

    if (analyticsError) {
      logger.warn('cleanup_analytics_delete_failed', {
        error: analyticsError.message,
      });
    }

    const responseTimeMs = Date.now() - startTime;

    logger.info('cleanup_complete', {
      deletedLogs: logsCount || 0,
      deletedAnalytics: analyticsCount || 0,
      cutoffDate: cutoffDate.toISOString(),
      responseTimeMs,
    });

    return new Response(
      JSON.stringify({
        success: true,
        deletedLogs: logsCount || 0,
        deletedAnalytics: analyticsCount || 0,
        cutoffDate: cutoffDate.toISOString(),
        retentionDays: RETENTION_DAYS,
        responseTimeMs,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    logger.error('cleanup_error', {
      error: String(error),
      responseTimeMs,
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Cleanup operation failed',
        responseTimeMs,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
}));
