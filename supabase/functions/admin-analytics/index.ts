/**
 * Admin Analytics Edge Function
 *
 * Returns aggregated search analytics for the admin dashboard via the
 * `get_search_analytics` database RPC function.
 *
 * ### Response payload sections
 * - `summary` — total searches, avg confidence, AI usage rate, days window
 * - `daily_volume` — per-day search counts over the lookback window
 * - `source_distribution` — cache / deterministic / pattern_match / ai / raw_syntax breakdown
 * - `confidence_buckets` — histogram of confidence score ranges
 * - `response_percentiles` — p50 / p95 / p99 response times in ms
 * - `top_queries` — top 20 most-searched natural-language queries
 * - `low_confidence` — queries with confidence < 0.6 (up to `max_low_confidence`, default 20)
 * - `deterministic_trend` — daily deterministic-vs-AI ratio over the window
 *
 * ### Auth
 * Requires the caller's JWT to belong to a user with `role = 'admin'` in
 * `user_roles`. Checked via the service-role client before the RPC is invoked.
 * The RPC itself is called with the user's own JWT so `auth.uid()` resolves
 * correctly inside `get_search_analytics`.
 *
 * ### Query params
 * | Param  | Default | Range  | Description                  |
 * |--------|---------|--------|------------------------------|
 * | `days` | `7`     | 1–90   | Lookback window in whole days |
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
