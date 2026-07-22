/**
 * Admin Search Quality Repair Function
 *
 * Returns ranked query repair candidates and detail payloads, and supports
 * admin-safe create/edit operations for translation rules.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, logAuthFailure } from '../_shared/auth.ts';
import { withLogging } from '../_shared/logger.ts';

type QueryRow = {
  normalized_query: string;
  total_searches: number;
  successful_searches: number;
  result_clicks: number;
  refinements: number;
  no_results: number;
  recoveries: number;
  feedback_reports: number;
  avg_time_to_click_ms: number | null;
  search_quality_score: number;
  confidence: number;
  sample_size: number;
  updated_at: string;
};

serve(withLogging('admin-search-quality-repair', async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    await logAuthFailure(req, 'Missing Authorization header', 'admin-search-quality-repair');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    await logAuthFailure(req, userError?.message ?? 'Invalid token', 'admin-search-quality-repair');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);
  const { data: roleData } = await adminClient.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
  if (!roleData) {
    await logAuthFailure(req, 'Forbidden: admin role required', 'admin-search-quality-repair');
    return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), { status: 403, headers });
  }

  if (req.method === 'POST') {
    const body = (await req.json().catch(() => null)) as
      | { id?: string; pattern?: string; scryfall_syntax?: string; description?: string | null; confidence?: number; is_active?: boolean; source_feedback_id?: string | null }
      | null;

    if (!body?.pattern || !body.scryfall_syntax) {
      return new Response(JSON.stringify({ error: 'pattern and scryfall_syntax are required' }), { status: 400, headers });
    }

    const payload = {
      pattern: body.pattern.toLowerCase().trim(),
      scryfall_syntax: body.scryfall_syntax.trim(),
      description: body.description ?? null,
      confidence: body.confidence ?? 0,
      is_active: body.is_active ?? true,
      source_feedback_id: body.source_feedback_id ?? null,
    };

    const result = body.id
      ? await adminClient.from('translation_rules').update(payload).eq('id', body.id).select('id').maybeSingle()
      : await adminClient.from('translation_rules').insert(payload).select('id').maybeSingle();

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error.message }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ success: true, id: result.data?.id ?? body.id ?? null }), { headers });
  }

  const url = new URL(req.url);
  const days = Math.min(Number.parseInt(url.searchParams.get('days') ?? '7', 10) || 7, 90);
  const query = url.searchParams.get('query')?.trim().toLowerCase() ?? '';
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  if (query) {
    const [{ data: detailRows }, { data: feedbackRows }, { data: ruleRows }, { data: outcomeRows }] = await Promise.all([
      adminClient.from('query_intelligence_agg').select('*').eq('normalized_query', query).maybeSingle(),
      adminClient
        .from('search_feedback')
        .select('id, original_query, translated_query, issue_description, processing_status, created_at, processed_at, generated_rule_id, scryfall_validation_count, translation_rules!fk_search_feedback_generated_rule ( pattern, scryfall_syntax, confidence, is_active, description )')
        .or(`original_query.ilike.${query},translated_query.ilike.${query}`)
        .order('created_at', { ascending: false })
        .limit(20),
      adminClient.from('translation_rules').select('id, pattern, scryfall_syntax, confidence, is_active, description, created_at, source_feedback_id, archived_at').or(`pattern.ilike.${query},scryfall_syntax.ilike.${query}`).order('created_at', { ascending: false }).limit(20),
      adminClient.from('query_signal_events').select('event_type, created_at, time_to_click_ms, metadata').eq('normalized_query', query).order('created_at', { ascending: false }).limit(25),
    ]);

    const detail = detailRows as QueryRow | null;
    return new Response(JSON.stringify({
      detail: detail
        ? {
            ...detail,
            display_query: detail.normalized_query,
            recent_translation_count: 0,
            recent_feedback_count: 0,
            existing_rule_count: (ruleRows?.length ?? 0),
            matching_rule_count: (ruleRows?.length ?? 0),
            has_active_rule: (ruleRows ?? []).some((r) => r.is_active && !r.archived_at),
            has_translation_rule: (ruleRows?.length ?? 0) > 0,
            last_seen_at: outcomeRows?.[0]?.created_at ?? detail.updated_at,
            feedback: (feedbackRows ?? []) as never,
            rules: (ruleRows ?? []) as never,
            recentOutcomes: (outcomeRows ?? []) as never,
          }
        : null,
    }), { headers });
  }

  const { data: rows, error } = await adminClient
    .from('query_intelligence_agg')
    .select('*')
    .gte('updated_at', since)
    .order('search_quality_score', { ascending: true })
    .limit(200);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }

  const queue = (rows ?? []).map((row) => {
    const typed = row as QueryRow;
    return {
      normalized_query: typed.normalized_query,
      display_query: typed.normalized_query,
      total_searches: typed.total_searches,
      successful_searches: typed.successful_searches,
      result_clicks: typed.result_clicks,
      refinements: typed.refinements,
      no_results: typed.no_results,
      recoveries: typed.recoveries,
      feedback_reports: typed.feedback_reports,
      avg_time_to_click_ms: typed.avg_time_to_click_ms,
      search_quality_score: typed.search_quality_score,
      confidence: typed.confidence,
      sample_size: typed.sample_size,
      recent_translation_count: 0,
      recent_feedback_count: 0,
      existing_rule_count: 0,
      matching_rule_count: 0,
      has_active_rule: false,
      has_translation_rule: false,
      last_seen_at: typed.updated_at,
    };
  });

  return new Response(JSON.stringify({ queue }), { headers });
}));
