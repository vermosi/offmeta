/**
 * Cleanup Logs Edge Function
 * 
 * Deletes translation_logs older than 30 days to prevent database bloat.
 * Should be called via cron job or manual trigger.
 * 
 * @module cleanup-logs
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RETENTION_DAYS = 30;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    console.log(`Starting log cleanup. Deleting logs older than ${cutoffDate.toISOString()}`);

    // Delete old translation logs
    const { error: logsError, count: logsCount } = await supabase
      .from('translation_logs')
      .delete({ count: 'exact' })
      .lt('created_at', cutoffDate.toISOString());

    if (logsError) {
      throw new Error(`Failed to delete translation_logs: ${logsError.message}`);
    }

    // Also clean up old analytics events (same retention period)
    const { error: analyticsError, count: analyticsCount } = await supabase
      .from('analytics_events')
      .delete({ count: 'exact' })
      .lt('created_at', cutoffDate.toISOString());

    if (analyticsError) {
      console.warn(`Failed to delete analytics_events: ${analyticsError.message}`);
    }

    const responseTimeMs = Date.now() - startTime;

    console.log(JSON.stringify({
      event: 'cleanup_complete',
      deletedLogs: logsCount || 0,
      deletedAnalytics: analyticsCount || 0,
      cutoffDate: cutoffDate.toISOString(),
      responseTimeMs
    }));

    return new Response(JSON.stringify({ 
      success: true, 
      deletedLogs: logsCount || 0,
      deletedAnalytics: analyticsCount || 0,
      cutoffDate: cutoffDate.toISOString(),
      retentionDays: RETENTION_DAYS,
      responseTimeMs
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    console.error(JSON.stringify({
      event: 'cleanup_error',
      error: String(error),
      responseTimeMs
    }));
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: String(error),
      responseTimeMs
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
