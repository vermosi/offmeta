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
    // Fetch translation logs
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('translation_logs')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (logsError) throw logsError;

    // Fetch analytics events summary
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('analytics_events')
      .select('event_type, created_at')
      .gte('created_at', since)
      .limit(5000);

    if (eventsError) throw eventsError;

    // Compute aggregates
    const totalSearches = logs?.length || 0;
    const avgConfidence = totalSearches > 0
      ? (logs!.reduce((sum, l) => sum + (l.confidence_score || 0), 0) / totalSearches)
      : 0;
    const avgResponseTime = totalSearches > 0
      ? (logs!.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / totalSearches)
      : 0;
    const fallbackCount = logs?.filter(l => l.fallback_used).length || 0;

    // Source breakdown
    const sourceBreakdown: Record<string, number> = {};
    logs?.forEach(l => {
      const src = l.source || 'ai';
      sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1;
    });

    // Confidence distribution
    const confidenceBuckets = { high: 0, medium: 0, low: 0 };
    logs?.forEach(l => {
      const c = l.confidence_score || 0;
      if (c >= 0.8) confidenceBuckets.high++;
      else if (c >= 0.6) confidenceBuckets.medium++;
      else confidenceBuckets.low++;
    });

    // Daily volume
    const dailyVolume: Record<string, number> = {};
    logs?.forEach(l => {
      const day = l.created_at?.substring(0, 10) || 'unknown';
      dailyVolume[day] = (dailyVolume[day] || 0) + 1;
    });

    // Event type breakdown
    const eventBreakdown: Record<string, number> = {};
    events?.forEach(e => {
      eventBreakdown[e.event_type] = (eventBreakdown[e.event_type] || 0) + 1;
    });

    // Recent low-confidence queries for review
    const lowConfidenceQueries = logs
      ?.filter(l => (l.confidence_score || 0) < 0.6)
      .slice(0, 20)
      .map(l => ({
        query: l.natural_language_query,
        translated: l.translated_query,
        confidence: l.confidence_score,
        source: l.source,
        time: l.created_at,
      })) || [];

    return new Response(JSON.stringify({
      summary: {
        totalSearches,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        avgResponseTime: Math.round(avgResponseTime),
        fallbackRate: totalSearches > 0 ? Math.round((fallbackCount / totalSearches) * 100) : 0,
        days,
      },
      sourceBreakdown,
      confidenceBuckets,
      dailyVolume,
      eventBreakdown,
      lowConfidenceQueries,
    }), { headers });
  } catch (e) {
    console.error('Analytics error:', e);
    return new Response(JSON.stringify({ error: 'Failed to fetch analytics' }), { status: 500, headers });
  }
});
