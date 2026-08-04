/**
 * error-auto-fix — Reads open rows from public.error_events, applies a repair
 * strategy per failure class, and records the outcome back on the row.
 *
 * Runs on a schedule (pg_cron) and can be triggered manually from the admin
 * panel. Repairs are limited to safe, idempotent actions:
 *
 *   sitemap_*            -> regenerate/resubmit the sitemap (submit-sitemap)
 *   card_data_gap        -> re-run bulk-data-sync to refill missing card rows
 *   seo_page_failure     -> re-run auto-generate-seo-pages
 *   edge_function_failure-> retry the named function once
 *   chunk_load_failed    -> client-side only, marked ignored (no server fix)
 *
 * @module functions/error-auto-fix
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { withLogging } from '../_shared/logger.ts';
import { requireServiceOrPipelineKey } from '../_shared/auth.ts';

const MAX_ROWS_PER_RUN = 15;
const MAX_FIX_ATTEMPTS = 3;

/** Edge functions this job is allowed to invoke as a repair action. */
const REPAIRABLE_FUNCTIONS = new Set([
  'submit-sitemap',
  'bulk-data-sync',
  'auto-generate-seo-pages',
  'sync-card-names',
  'price-snapshot',
  'seo-health-check',
]);

interface ErrorRow {
  id: string;
  source: string;
  error_type: string;
  message: string;
  url: string | null;
  status: string;
  fix_attempts: number;
  context: Record<string, unknown> | null;
}

interface FixOutcome {
  action: string;
  ok: boolean;
  detail?: string;
}

async function invokeFunction(name: string, body: unknown): Promise<FixOutcome> {
  if (!REPAIRABLE_FUNCTIONS.has(name)) {
    return { action: `invoke:${name}`, ok: false, detail: 'function_not_allowed' };
  }
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    return { action: `invoke:${name}`, ok: false, detail: 'missing_env' };
  }
  try {
    const res = await fetch(`${url}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body ?? {}),
    });
    const text = (await res.text()).slice(0, 500);
    return { action: `invoke:${name}`, ok: res.ok, detail: `${res.status} ${text}` };
  } catch (err) {
    return { action: `invoke:${name}`, ok: false, detail: String(err).slice(0, 300) };
  }
}

/** Verify the live sitemap is servable and non-trivial. */
async function verifySitemap(): Promise<FixOutcome> {
  try {
    const res = await fetch('https://offmeta.app/sitemap.xml', {
      headers: { 'User-Agent': 'OffMeta-AutoFix/1.0' },
    });
    const body = await res.text();
    const urls = (body.match(/<loc>/g) ?? []).length;
    return {
      action: 'verify:sitemap',
      ok: res.ok && urls >= 20,
      detail: `status=${res.status} urls=${urls}`,
    };
  } catch (err) {
    return { action: 'verify:sitemap', ok: false, detail: String(err).slice(0, 300) };
  }
}

/**
 * Pick and run the repair strategy for a single error row.
 */
async function repair(row: ErrorRow): Promise<FixOutcome[]> {
  const type = row.error_type.toLowerCase();
  const source = row.source.toLowerCase();

  if (type.includes('sitemap') || source === 'submit-sitemap') {
    const submit = await invokeFunction('submit-sitemap', { force: true });
    const verify = await verifySitemap();
    return [submit, verify];
  }

  if (type.includes('card_data_gap') || source === 'bulk-data-sync') {
    return [await invokeFunction('bulk-data-sync', { reason: 'auto-fix' })];
  }

  if (type.includes('seo_page') || source === 'auto-generate-seo-pages') {
    return [await invokeFunction('auto-generate-seo-pages', { reason: 'auto-fix' })];
  }

  if (type.includes('card_name')) {
    return [await invokeFunction('sync-card-names', { reason: 'auto-fix' })];
  }

  if (type === 'edge_function_failure') {
    const target = String(row.context?.function_name ?? '');
    if (!target) {
      return [{ action: 'retry', ok: false, detail: 'no function_name in context' }];
    }
    return [await invokeFunction(target, { reason: 'auto-fix' })];
  }

  // Client-only failures (stale chunks, user network drops) have no server-side
  // remedy — the app already self-recovers with a bounded reload.
  if (type === 'chunk_load_failed' || type === 'network_failure') {
    return [{ action: 'none', ok: true, detail: 'client_recoverable' }];
  }

  return [{ action: 'none', ok: false, detail: 'no_strategy' }];
}

Deno.serve(
  withLogging('error-auto-fix', async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

    const authCheck = await requireServiceOrPipelineKey(req, corsHeaders);
    if (!authCheck.authorized) return authCheck.response;


    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: rows, error } = await supabase
      .from('error_events')
      .select('id,source,error_type,message,url,status,fix_attempts,context')
      .in('status', ['open', 'failed'])
      .lt('fix_attempts', MAX_FIX_ATTEMPTS)
      .order('occurrence_count', { ascending: false })
      .limit(MAX_ROWS_PER_RUN);

    if (error) {
      return new Response(
        JSON.stringify({ error: 'query_failed', details: error.message }),
        { status: 500, headers },
      );
    }

    const results: Array<Record<string, unknown>> = [];

    for (const row of (rows ?? []) as ErrorRow[]) {
      await supabase
        .from('error_events')
        .update({ status: 'repairing' })
        .eq('id', row.id);

      const outcomes = await repair(row);
      const ok = outcomes.every((o) => o.ok);
      const noStrategy = outcomes.some((o) => o.detail === 'no_strategy');

      await supabase
        .from('error_events')
        .update({
          status: noStrategy ? 'open' : ok ? 'repaired' : 'failed',
          fix_attempts: row.fix_attempts + 1,
          last_fix_at: new Date().toISOString(),
          last_fix_result: { outcomes },
        })
        .eq('id', row.id);

      results.push({
        id: row.id,
        error_type: row.error_type,
        repaired: ok && !noStrategy,
        outcomes,
      });
    }

    // Retention: drop long-resolved rows.
    try {
      await supabase.rpc('prune_old_error_events');
    } catch {
      /* best effort */
    }

    return new Response(
      JSON.stringify({
        examined: results.length,
        repaired: results.filter((r) => r.repaired).length,
        results,
      }),
      { status: 200, headers },
    );
  }),
);
