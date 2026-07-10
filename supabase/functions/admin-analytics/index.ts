/**
 * Admin Analytics Edge Function
 *
 * Returns aggregated search analytics for the admin dashboard via the
 * `get_search_analytics` database RPC function.
 * Requires admin role (checked via getUser + user_roles query).
 *
 * @module admin-analytics
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/auth.ts';
import { requireAdminJob } from '../_shared/jobGuards.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  const authCheck = await requireAdminJob(req);
  if (!authCheck.authorized) {
    return authCheck.response;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const authHeader = req.headers.get('authorization')!;

  // Create client with user's JWT to check role
  const supabaseUser = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: { headers: { Authorization: authHeader } },
    },
  );

  // Parse query params
  const url = new URL(req.url);
  const days = Math.min(parseInt(url.searchParams.get('days') || '7', 10), 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Call the public wrapper — it delegates to admin_api.get_search_analytics
    // after re-checking the admin role. PostgREST only exposes public/graphql_public,
    // so a direct admin_api RPC would return PGRST106.
    // Must call through the user's JWT client so auth.uid() resolves inside
    // has_role(); the service-role client has no auth context and the RPC's
    // admin check would raise "Insufficient privileges".
    const { data: analytics, error: rpcError } = await supabaseUser.rpc(
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
    return new Response(
      JSON.stringify({ error: 'Failed to fetch analytics' }),
      { status: 500, headers },
    );
  }
});
