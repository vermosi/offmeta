/**
 * submit-sitemap — Resubmits the OffMeta sitemap to Google Search Console.
 *
 * Called automatically by content pipelines (bulk-data-sync, auto-generate-seo-pages)
 * whenever new card / SEO pages are generated, so Google re-crawls the sitemap
 * without manual intervention.
 *
 * Flow (per Search Console connector rules):
 *   1. GET /webmasters/v3/sites through the Lovable connector gateway
 *   2. Keep only verified properties that cover https://offmeta.app/
 *   3. PUT /webmasters/v3/sites/{siteUrl}/sitemaps/{sitemapUrl}
 *
 * Submissions are throttled (default 6h) and logged to public.sitemap_submissions.
 *
 * @module functions/submit-sitemap
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  getCorsHeaders,
  requireServiceOrPipelineKey,
} from '../_shared/auth.ts';
import { createLogger, withLogging } from '../_shared/logger.ts';

const log = createLogger('submit-sitemap');

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_search_console';
const SITE_ORIGIN = 'https://offmeta.app';
const SITEMAP_URL = `${SITE_ORIGIN}/sitemap.xml`;
const DEFAULT_THROTTLE_HOURS = 6;

interface SiteEntry {
  siteUrl: string;
  permissionLevel?: string;
}

function coversTarget(siteUrl: string, target: URL): boolean {
  if (siteUrl.startsWith('sc-domain:')) {
    const domain = siteUrl.slice('sc-domain:'.length).toLowerCase();
    const host = target.hostname.toLowerCase();
    return host === domain || host.endsWith(`.${domain}`);
  }
  try {
    return target.href.startsWith(new URL(siteUrl).href);
  } catch {
    return false;
  }
}

serve(
  withLogging('submit-sitemap', async (req: Request): Promise<Response> => {
    const corsHeaders = getCorsHeaders(req);
    const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const authCheck = await requireServiceOrPipelineKey(req, corsHeaders);
    if (!authCheck.authorized) return authCheck.response;

    let source = 'manual';
    let newUrlCount: number | null = null;
    let force = false;
    try {
      const body = await req.json();
      if (typeof body?.source === 'string') source = body.source.slice(0, 64);
      if (typeof body?.newUrlCount === 'number') newUrlCount = body.newUrlCount;
      if (body?.force === true) force = true;
    } catch {
      // no body — treat as manual submission
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const record = async (
      status: string,
      extra: { site_url?: string | null; http_status?: number | null; error?: string | null },
    ) => {
      const { error } = await supabase.from('sitemap_submissions').insert({
        sitemap_url: SITEMAP_URL,
        site_url: extra.site_url ?? null,
        trigger_source: source,
        new_url_count: newUrlCount,
        status,
        http_status: extra.http_status ?? null,
        error: extra.error ?? null,
      });
      if (error) log.warn('Failed to log sitemap submission', { error: error.message });

      // Surface failures to the error monitor so the auto-fix job can retry.
      if (status === 'failed') {
        await reportEdgeError({
          source: 'submit-sitemap',
          errorType: 'sitemap_submission_failed',
          message: extra.error ?? 'Sitemap submission failed',
          url: SITEMAP_URL,
          severity: 'critical',
          context: { http_status: extra.http_status ?? null, trigger_source: source },
        });
      }
    };


    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const connectionApiKey = Deno.env.get('GOOGLE_SEARCH_CONSOLE_API_KEY');
    if (!lovableApiKey || !connectionApiKey) {
      await record('skipped', { error: 'Search Console connector not configured' });
      return new Response(
        JSON.stringify({ status: 'skipped', reason: 'connector_not_configured' }),
        { status: 200, headers },
      );
    }

    try {
      // Throttle: avoid hammering Search Console during multi-batch syncs.
      if (!force) {
        const since = new Date(
          Date.now() - DEFAULT_THROTTLE_HOURS * 60 * 60 * 1000,
        ).toISOString();
        const { count } = await supabase
          .from('sitemap_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'submitted')
          .gte('submitted_at', since);
        if ((count ?? 0) > 0) {
          log.info('Sitemap submission throttled', { source, newUrlCount });
          return new Response(
            JSON.stringify({
              status: 'throttled',
              throttleHours: DEFAULT_THROTTLE_HOURS,
            }),
            { status: 200, headers },
          );
        }
      }

      const gatewayHeaders = {
        Authorization: `Bearer ${lovableApiKey}`,
        'X-Connection-Api-Key': connectionApiKey,
      };

      // 1. Resolve the verified property covering offmeta.app
      const sitesRes = await fetch(`${GATEWAY_URL}/webmasters/v3/sites`, {
        headers: gatewayHeaders,
      });
      if (!sitesRes.ok) {
        const details = await sitesRes.text();
        log.warn('Failed to list Search Console properties', {
          status: sitesRes.status,
          details: details.slice(0, 300),
        });
        await record('failed', {
          http_status: sitesRes.status,
          error: `list_sites: ${details.slice(0, 300)}`,
        });
        return new Response(
          JSON.stringify({ status: 'failed', step: 'list_sites', httpStatus: sitesRes.status, details }),
          { status: sitesRes.status, headers },
        );
      }

      const { siteEntry = [] } = (await sitesRes.json()) as {
        siteEntry?: SiteEntry[];
      };
      const target = new URL(`${SITE_ORIGIN}/`);
      const matches = siteEntry.filter(
        (entry) =>
          entry.permissionLevel !== 'siteUnverifiedUser' &&
          coversTarget(entry.siteUrl, target),
      );

      if (matches.length !== 1) {
        const reason =
          matches.length === 0
            ? 'no verified Search Console property covers offmeta.app'
            : `multiple matching properties: ${matches.map((m) => m.siteUrl).join(', ')}`;
        await record('skipped', { error: reason });
        return new Response(
          JSON.stringify({ status: 'skipped', reason, candidates: matches.map((m) => m.siteUrl) }),
          { status: 200, headers },
        );
      }

      const siteUrl = matches[0].siteUrl;

      // 2. Resubmit the sitemap
      const submitRes = await fetch(
        `${GATEWAY_URL}/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(SITEMAP_URL)}`,
        { method: 'PUT', headers: gatewayHeaders },
      );

      if (!submitRes.ok) {
        const details = await submitRes.text();
        log.warn('Sitemap submission failed', {
          status: submitRes.status,
          details: details.slice(0, 300),
        });
        await record('failed', {
          site_url: siteUrl,
          http_status: submitRes.status,
          error: details.slice(0, 300),
        });
        return new Response(
          JSON.stringify({ status: 'failed', step: 'submit', httpStatus: submitRes.status, details }),
          { status: submitRes.status, headers },
        );
      }

      await record('submitted', { site_url: siteUrl, http_status: submitRes.status });
      log.info('Sitemap resubmitted', { siteUrl, source, newUrlCount });

      return new Response(
        JSON.stringify({ status: 'submitted', siteUrl, sitemapUrl: SITEMAP_URL, source, newUrlCount }),
        { status: 200, headers },
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      log.error('submit-sitemap error', e);
      await record('failed', { error: message.slice(0, 300) });
      return new Response(JSON.stringify({ status: 'failed', error: message }), {
        status: 500,
        headers,
      });
    }
  }),
);
