/**
 * Semrush SEO Edge Function
 *
 * Admin-only proxy to the Lovable connector gateway for Semrush data.
 * Results are cached in `public.semrush_cache` for 24h because the
 * connected Semrush account is on the free plan (tight daily API units).
 *
 * POST body: { domain?: string; database?: string; refresh?: boolean }
 *
 * @module semrush-seo
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/auth.ts';
import { requireAdminJob } from '../_shared/jobGuards.ts';
import { withLogging } from '../_shared/logger.ts';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/semrush';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DOMAIN = 'offmeta.app';

interface SemrushTable {
  columnNames: string[];
  rows: (string | number | null)[][];
}

type SemrushReport = {
  columns: string[];
  rows: Record<string, string>[];
  error?: string;
};

/**
 * Semrush returns human-readable column labels for domain reports but raw
 * codes for backlink reports, so rows are keyed by both the requested
 * `export_columns` code (positional) and the returned label.
 */
function toReport(data: unknown, requestedCodes: string[]): SemrushReport {
  const table = (data as { data?: SemrushTable })?.data;
  if (!table?.columnNames) return { columns: [], rows: [] };
  const columns = table.columnNames;
  const rows = (table.rows ?? []).map((row) => {
    const record: Record<string, string> = {};
    columns.forEach((column, index) => {
      const value = String(row[index] ?? '');
      record[column] = value;
      const code = requestedCodes[index];
      if (code) record[code] = value;
    });
    return record;
  });
  return { columns, rows };
}

async function callSemrush(
  path: string,
  params: Record<string, string>,
): Promise<SemrushReport> {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const connectionKey = Deno.env.get('SEMRUSH_API_KEY');
  if (!lovableKey || !connectionKey) {
    return { columns: [], rows: [], error: 'Semrush connection is not configured.' };
  }

  const url = new URL(`${GATEWAY_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': connectionKey,
      'Allow-Limit-Offset': 'true',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Semrush ${path} failed [${response.status}]: ${body}`);
    const quotaExhausted =
      body.includes('LIMIT EXCEEDED') || response.status === 403;
    return {
      columns: [],
      rows: [],
      error: quotaExhausted
        ? 'Semrush API quota exhausted — the free plan resets daily.'
        : `Semrush request failed (${response.status}).`,
    };
  }

  const requestedCodes = (params.export_columns ?? '')
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean);
  return toReport(await response.json(), requestedCodes);
}

serve(
  withLogging('semrush-seo', async (req) => {
    const corsHeaders = getCorsHeaders(req);
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

    const authCheck = await requireAdminJob(req);
    if (!authCheck.authorized) return authCheck.response;

    let body: { domain?: string; database?: string; refresh?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const domain = (body.domain || DEFAULT_DOMAIN).trim().toLowerCase();
    const database = (body.database || 'us').trim().toLowerCase();
    const refresh = body.refresh === true;
    const cacheKey = `${domain}:${database}`;

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    if (!refresh) {
      const { data: cached } = await admin
        .from('semrush_cache')
        .select('payload, fetched_at')
        .eq('cache_key', cacheKey)
        .maybeSingle();

      if (
        cached &&
        Date.now() - new Date(cached.fetched_at).getTime() < CACHE_TTL_MS
      ) {
        return new Response(
          JSON.stringify({
            ...(cached.payload as Record<string, unknown>),
            cached: true,
            fetchedAt: cached.fetched_at,
          }),
          { headers },
        );
      }
    }

    try {
      const [overview, keywords, history, backlinks, limits] =
        await Promise.all([
          callSemrush('/domains/domain_ranks', {
            domain,
            database,
            export_columns: 'Db,Dn,Rk,Or,Ot,Oc,Ad,At,Ac',
          }),
          callSemrush('/domains/domain_organic', {
            domain,
            database,
            export_columns: 'Ph,Po,Pp,Nq,Cp,Ur,Tr,Kd',
            display_sort: 'tr_desc',
            display_limit: '50',
          }),
          callSemrush('/domains/domain_rank_history', {
            domain,
            database,
            export_columns: 'Rk,Or,Ot,Oc,Dt',
            display_limit: '24',
          }),
          callSemrush('/backlinks/backlinks_overview', {
            target: domain,
            target_type: 'root_domain',
          }),
          callSemrush('/user/limits', {}),
        ]);

      const payload = {
        domain,
        database,
        overview,
        keywords,
        history,
        backlinks,
        limits,
      };

      await admin.from('semrush_cache').upsert(
        {
          cache_key: cacheKey,
          payload,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: 'cache_key' },
      );

      return new Response(
        JSON.stringify({
          ...payload,
          cached: false,
          fetchedAt: new Date().toISOString(),
        }),
        { headers },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('semrush-seo failed:', message);
      return new Response(
        JSON.stringify({ error: 'Semrush request failed', details: message }),
        { status: 502, headers },
      );
    }
  }),
);
