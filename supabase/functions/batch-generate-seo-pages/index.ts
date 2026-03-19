/**
 * Batch generate SEO pages from seed queries.
 * Calls generate-seo-page for each query sequentially with delays.
 * Admin-only endpoint.
 */

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve: (handler: (req: Request) => Promise<Response>) => void;
};

import { getCorsHeaders } from '../_shared/auth.ts';
import { logEvent } from '../_shared/logger.ts';

const SEED_QUERIES = [
  'best mana rocks for commander',
  'board wipes in magic the gathering',
  'creatures that make treasure tokens mtg',
  'cheap green ramp spells mtg',
  'artifacts that produce two or more mana',
  'blue counterspells mtg',
  'creatures with flying mtg',
  'token doublers magic the gathering',
  'two mana counterspells mtg',
  'red creatures that deal damage to each opponent',
  'utility lands for commander under $5',
  'gruul landfall creatures for commander',
  'black card draw enchantments mtg',
  'white removal spells magic the gathering',
  'sacrifice outlets for commander',
  'graveyard recursion cards commander',
  'cards that create food tokens mtg',
  'best tutors for commander',
  'free spells in magic the gathering',
  'cards that draw when creatures die mtg',
];

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // This function requires the service role key for inner calls anyway
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceKey) {
    return new Response(JSON.stringify({ error: 'Not configured' }), {
      status: 500,
      headers,
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  let body: { queries?: string[]; publish?: boolean; regenerate?: boolean } =
    {};
  try {
    body = await req.json();
  } catch {
    /* use defaults */
  }

  const queries = body.queries ?? SEED_QUERIES;
  const publish = body.publish ?? true;
  const regenerate = body.regenerate ?? false;

  const results: Array<{
    query: string;
    status: string;
    slug?: string;
    error?: string;
  }> = [];

  for (const query of queries) {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/generate-seo-page`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query, publish, regenerate }),
      });

      const data = await res.json();

      if (res.ok) {
        results.push({ query, status: 'success', slug: data.slug });
        logEvent('info', 'batch_seo_page_created', { query, slug: data.slug });
      } else {
        results.push({
          query,
          status: 'error',
          error: data.error ?? `HTTP ${res.status}`,
        });
        logEvent('warn', 'batch_seo_page_failed', { query, error: data.error });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      results.push({ query, status: 'error', error: msg });
    }

    // Delay between generations (1s — no Scryfall rate limits, local DB validation)
    await new Promise((r) => setTimeout(r, 1000));
  }

  const succeeded = results.filter((r) => r.status === 'success').length;
  const failed = results.filter((r) => r.status === 'error').length;

  logEvent('info', 'batch_seo_complete', {
    total: queries.length,
    succeeded,
    failed,
  });

  return new Response(
    JSON.stringify({ total: queries.length, succeeded, failed, results }),
    { status: 200, headers },
  );
});
