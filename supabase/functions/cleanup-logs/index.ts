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
import { requireAdmin, getCorsHeaders } from '../_shared/auth.ts';
import { validateEnv } from '../_shared/env.ts';
import { checkRateLimit, maybeCleanup } from '../_shared/rateLimit.ts';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = validateEnv([
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
]);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const RETENTION_DAYS = 30;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Require admin role (not just any valid token)
  const adminCheck = await requireAdmin(req, corsHeaders);
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  // Rate limiting: 1 req/min (batch job)
  maybeCleanup();
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed, retryAfter } = await checkRateLimit(clientIp, undefined, 1, 10);
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded', success: false }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) } },
    );
  }

  const startTime = Date.now();

  try {
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    console.log(
      `Starting log cleanup. Deleting logs older than ${cutoffDate.toISOString()}`,
    );

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
      console.warn(
        `Failed to delete analytics_events: ${analyticsError.message}`,
      );
    }

    const responseTimeMs = Date.now() - startTime;

    console.log(
      JSON.stringify({
        event: 'cleanup_complete',
        deletedLogs: logsCount || 0,
        deletedAnalytics: analyticsCount || 0,
        cutoffDate: cutoffDate.toISOString(),
        responseTimeMs,
      }),
    );

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
    console.error(
      JSON.stringify({
        event: 'cleanup_error',
        error: String(error),
        responseTimeMs,
      }),
    );

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
});
