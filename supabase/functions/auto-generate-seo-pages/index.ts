/**
 * Auto-generate SEO pages from popular queries in translation_logs.
 * Runs weekly via cron. Picks top N queries that don't already have pages.
 */

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (handler: (req: Request) => Promise<Response>) => void;
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, requireServiceRole } from '../_shared/auth.ts';
import { logEvent } from '../_shared/logger.ts';

// Increased from 5 → 15 per growth plan to expand /ai/* SEO surface daily.
const MAX_NEW_PAGES = 15;

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authz = requireServiceRole(req, corsHeaders);
  if (!authz.authorized) {
    return authz.response;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Get existing slugs to avoid duplicates
    const { data: existingPages } = await supabase
      .from('seo_pages')
      .select('query');
    const existingQueries = new Set(
      (existingPages ?? []).map((p: { query: string }) =>
        p.query.toLowerCase(),
      ),
    );

    // Find popular queries from translation_logs (last 30 days, min 3 occurrences, high confidence)
    const { data: candidates } = await supabase.rpc(
      'get_promotion_candidates',
      {
        since_date: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        min_frequency: 3,
        min_confidence: 0.7,
        max_results: 30,
      },
    );

    // Filter out already existing pages
    const newQueries = (candidates ?? [])
      .map((c: { query: string }) => c.query)
      .filter((q: string) => !existingQueries.has(q.toLowerCase()))
      .slice(0, MAX_NEW_PAGES);

    if (newQueries.length === 0) {
      logEvent('info', 'auto_seo_no_candidates', {
        existingCount: existingQueries.size,
      });
      return new Response(
        JSON.stringify({
          message: 'No new candidates found',
          existingPages: existingQueries.size,
        }),
        { status: 200, headers },
      );
    }

    // Generate pages sequentially
    const results: Array<{
      query: string;
      status: string;
      slug?: string;
      error?: string;
    }> = [];

    for (const query of newQueries) {
      try {
        const res = await fetch(
          `${supabaseUrl}/functions/v1/generate-seo-page`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ query, publish: true }),
          },
        );

        const data = await res.json();
        if (res.ok) {
          results.push({ query, status: 'success', slug: data.slug });
          logEvent('info', 'auto_seo_page_created', { query, slug: data.slug });
        } else {
          results.push({
            query,
            status: 'error',
            error: data.error ?? `HTTP ${res.status}`,
          });
        }
      } catch (err) {
        results.push({
          query,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown',
        });
      }

      await new Promise((r) => setTimeout(r, 1000));
    }

    const succeeded = results.filter((r) => r.status === 'success').length;
    logEvent('info', 'auto_seo_complete', {
      total: newQueries.length,
      succeeded,
    });

    return new Response(
      JSON.stringify({ total: newQueries.length, succeeded, results }),
      { status: 200, headers },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    logEvent('error', 'auto_seo_failed', { error: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers,
    });
  }
});
