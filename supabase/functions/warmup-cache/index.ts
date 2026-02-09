/**
 * Cache Warmup Edge Function
 *
 * Pre-populates the query_cache with common MTG search patterns.
 * Run this after deployment or on a schedule to boost cache hit rate.
 *
 * Endpoint: POST /functions/v1/warmup-cache
 * Optional body: { "queries": ["custom query 1", "custom query 2"] }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateAuth, getCorsHeaders } from '../_shared/auth.ts';
import { validateEnv } from '../_shared/env.ts';

const { SUPABASE_URL, SUPABASE_ANON_KEY } = validateEnv([
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
]);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Common MTG queries that should be pre-cached
const COMMON_QUERIES = [
  // Ramp & Mana
  'green ramp',
  'mana dorks',
  'mana rocks',
  'land ramp',
  'artifact ramp',
  'cheap mana rocks',
  'mana rocks under $5',
  'two mana rocks',
  'sol ring alternatives',

  // Card Draw
  'blue card draw',
  'black card draw',
  'green card draw',
  'card draw engines',
  'cantrips',
  'wheel effects',

  // Removal
  'white removal',
  'black removal',
  'creature removal',
  'artifact removal',
  'enchantment removal',
  'board wipes',
  'cheap board wipes',
  'single target removal',

  // Counterspells
  'blue counterspells',
  'cheap counterspells',
  'two mana counterspells',
  'free counterspells',

  // Tutors
  'black tutors',
  'green tutors',
  'creature tutors',
  'land tutors',
  'artifact tutors',
  'enchantment tutors',

  // Tribal
  'elf tribal',
  'goblin tribal',
  'zombie tribal',
  'vampire tribal',
  'dragon tribal',
  'angel tribal',
  'merfolk tribal',
  'human tribal',
  'sliver tribal',
  'elf lords',
  'goblin lords',
  'zombie lords',

  // Sacrifice
  'sacrifice outlets',
  'free sacrifice outlets',
  'aristocrats',
  'blood artist effects',
  'death triggers',
  'grave pact effects',

  // Graveyard
  'reanimation spells',
  'self mill',
  'graveyard recursion',
  'graveyard hate',
  'flashback spells',

  // Tokens
  'token generators',
  'treasure token makers',
  'token doublers',
  'populate effects',

  // Combat
  'haste enablers',
  'extra combat steps',
  'double strike',
  'unblockable creatures',
  'trample enablers',

  // Control
  'stax pieces',
  'hatebears',
  'pillowfort',
  'protection spells',

  // Blink
  'blink effects',
  'flicker effects',
  'etb creatures',

  // Commander Specific
  'partner commanders',
  'mono red commanders',
  'mono green commanders',
  'mono blue commanders',
  'mono black commanders',
  'mono white commanders',
  'simic commanders',
  'rakdos commanders',
  'orzhov commanders',

  // Color Combinations
  'rakdos sacrifice',
  'simic ramp',
  'orzhov lifegain',
  'gruul creatures',
  'azorius control',
  'dimir mill',
  'golgari graveyard',
  'boros aggro',
  'izzet spellslinger',
  'selesnya tokens',

  // Budget
  'cheap green creatures',
  'budget removal',
  'affordable tutors',
  'budget mana rocks',

  // Lands
  'fetch lands',
  'shock lands',
  'dual lands',
  'pain lands',
  'tri lands',
  'modal lands',
  'creature lands',

  // Special Effects
  'extra turn spells',
  'copy effects',
  'theft effects',
  'mind control',
  'clone effects',
  'polymorph effects',

  // Recent/Popular
  'new commanders',
  'popular commander cards',
  'staple cards',
];

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify authorization
  const { authorized, error: authError } = validateAuth(req);
  if (!authorized) {
    return new Response(JSON.stringify({ error: authError, success: false }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const startTime = Date.now();

  try {
    // Parse optional custom queries from request body
    let customQueries: string[] = [];
    try {
      const body = await req.json();
      if (body?.queries && Array.isArray(body.queries)) {
        customQueries = body.queries.filter(
          (q: unknown) => typeof q === 'string' && q.length > 0,
        );
      }
    } catch {
      // No body or invalid JSON - use defaults only
    }

    const queriesToWarm =
      customQueries.length > 0 ? customQueries : COMMON_QUERIES;

    console.log(
      JSON.stringify({
        event: 'warmup_started',
        queryCount: queriesToWarm.length,
        custom: customQueries.length > 0,
      }),
    );

    const results = {
      total: queriesToWarm.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Process queries in batches to avoid overwhelming the system
    const BATCH_SIZE = 5;
    const DELAY_BETWEEN_BATCHES = 1000; // 1 second

    for (let i = 0; i < queriesToWarm.length; i += BATCH_SIZE) {
      const batch = queriesToWarm.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (query) => {
        try {
          const { data, error } = await supabase.functions.invoke(
            'semantic-search',
            {
              body: { query },
            },
          );

          if (error) {
            console.error(`Warmup failed for "${query}":`, error.message);
            results.failed++;
            results.errors.push(`${query}: ${error.message}`);
          } else if (data?.cached) {
            // Already in cache
            results.skipped++;
          } else if (data?.success) {
            results.successful++;
            console.log(
              JSON.stringify({
                event: 'query_warmed',
                query: query.substring(0, 50),
                confidence: data.explanation?.confidence,
              }),
            );
          } else {
            results.failed++;
            results.errors.push(`${query}: Unknown error`);
          }
        } catch (err) {
          console.error(`Warmup exception for "${query}":`, err);
          results.failed++;
          results.errors.push(`${query}: ${String(err)}`);
        }
      });

      await Promise.all(batchPromises);

      // Add delay between batches (except for last batch)
      if (i + BATCH_SIZE < queriesToWarm.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, DELAY_BETWEEN_BATCHES),
        );
      }
    }

    const duration = Date.now() - startTime;

    console.log(
      JSON.stringify({
        event: 'warmup_complete',
        ...results,
        durationMs: duration,
      }),
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cache warmup complete`,
        results: {
          total: results.total,
          newlyCached: results.successful,
          alreadyCached: results.skipped,
          failed: results.failed,
        },
        durationMs: duration,
        ...(results.errors.length > 0 && results.errors.length <= 10
          ? { errors: results.errors }
          : results.errors.length > 10
            ? {
                errors: results.errors.slice(0, 10),
                moreErrors: results.errors.length - 10,
              }
            : {}),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Warmup error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Cache warmup failed',
        durationMs: Date.now() - startTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
