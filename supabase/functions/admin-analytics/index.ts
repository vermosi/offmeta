/**
 * Admin Analytics Edge Function
 *
 * Returns aggregated search analytics for the admin dashboard, including:
 * - Summary stats (total searches, avg confidence, AI usage rate)
 * - Daily search volume breakdown
 * - Source distribution (cache / deterministic / ai / pattern_match)
 * - Confidence score buckets
 * - Response time percentiles (p50 / p95 / p99)
 * - Top 20 most-searched queries
 * - Low-confidence queries (for translation review)
 * - Deterministic coverage trend over the requested window
 *
 * Auth: requires the caller to hold the `admin` role in the `user_roles` table.
 * The check is performed with a service-role client; the RPC itself is called
 * with the user's own JWT so that `auth.uid()` resolves correctly inside the
 * `get_search_analytics` database function.
 *
 * Query params:
 *   ?days=7   — lookback window in days (1–90, default 7)
 *
 * @module admin-analytics
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  // Validate auth token
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Create client with user's JWT to check role
  const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  // Check admin role using service role client
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const { data: roleData } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (!roleData) {
    return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), { status: 403, headers });
  }

  // Parse query params
  const url = new URL(req.url);
  const days = Math.min(parseInt(url.searchParams.get('days') || '7', 10), 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Call RPC using the user's JWT so auth.uid() resolves correctly inside the function
    // (service role bypasses auth.uid(), causing the admin check to fail)
    const supabaseUserForRpc = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: analytics, error: rpcError } = await supabaseUserForRpc.rpc(
      'get_search_analytics',
      { since_date: since, max_low_confidence: 20 },
    );

    if (rpcError) throw rpcError;

    // Add days to summary
    const result = analytics as Record<string, unknown>;
    const summary = result.summary as Record<string, unknown>;
    summary.days = days;

    return new Response(JSON.stringify(result), { headers });
  } catch (e) {
    console.error('Analytics error:', e);
    return new Response(JSON.stringify({ error: 'Failed to fetch analytics' }), { status: 500, headers });
  }
});
