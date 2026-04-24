/**
 * Promote Searches Edge Function
 *
 * Auto-promotes popular queries from translation_logs into curated_searches.
 * Criteria: frequency ≥ 5, avg confidence ≥ 0.75, not already curated.
 * Inserts with source='auto' and lower priority than editorial entries.
 * Intended to run weekly via pg_cron.
 *
 * @module promote-searches
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, validateAuth } from '../_shared/auth.ts';
import { validateEnv } from '../_shared/env.ts';
import { createLogger } from '../_shared/logger.ts';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = validateEnv([
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
]);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const logger = createLogger('promote-searches');

/** Minimum number of times a query must appear to be considered (lowered to widen SEO surface) */
const MIN_FREQUENCY = 3;
/** Minimum average confidence score (lowered from 0.85 → 0.75 per growth plan) */
const MIN_AVG_CONFIDENCE = 0.75;
/** Maximum number of queries to promote per run */
const MAX_PROMOTIONS = 20;
/** Look-back window in days */
const LOOKBACK_DAYS = 30;
/** Default priority for auto-promoted entries (lower than editorial ~0.6-0.9) */
const AUTO_PRIORITY = 0.4;

/** Generate a URL-safe slug from a query string */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

/** Infer a category from query keywords */
function inferCategory(query: string): string {
  const q = query.toLowerCase();
  if (/\b(commander|edh|command zone)\b/.test(q)) return 'commander';
  if (/\b(budget|cheap|under \$|affordable)\b/.test(q)) return 'budget';
  if (/\b(tribal|tribe|lord)\b/.test(q)) return 'tribal';
  if (/\b(standard|modern|pioneer|legacy|vintage|pauper)\b/.test(q)) return 'format';
  if (/\b(color|mono|azorius|dimir|rakdos|gruul|selesnya|orzhov|izzet|golgari|boros|simic)\b/.test(q)) return 'colors';
  if (/\b(etb|graveyard|sacrifice|token|ramp|draw|counter|tutor|mill|lifegain)\b/.test(q)) return 'mechanics';
  return 'general';
}

/** Build a human-readable title from a query */
function titleize(query: string): string {
  const words = query.trim().split(/\s+/);
  const titled = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  // Append "for MTG" if the title doesn't already mention MTG/Magic
  if (!/\b(mtg|magic)\b/i.test(titled)) {
    return `${titled} for MTG`;
  }
  return titled;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth guard: accept anon key (for pg_cron) or service role
  const auth = await validateAuth(req);
  if (!auth.authorized) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const startTime = Date.now();

  try {
    const since = new Date();
    since.setDate(since.getDate() - LOOKBACK_DAYS);

    logger.info('promote_started', {
      lookbackDays: LOOKBACK_DAYS,
      minFrequency: MIN_FREQUENCY,
      minAvgConfidence: MIN_AVG_CONFIDENCE,
    });

    // 1. Find popular high-confidence queries
    const { data: candidates, error: queryError } = await supabase.rpc(
      'get_promotion_candidates',
      {
        since_date: since.toISOString(),
        min_frequency: MIN_FREQUENCY,
        min_confidence: MIN_AVG_CONFIDENCE,
        max_results: MAX_PROMOTIONS * 2, // fetch extras in case some slugs collide
      },
    );

    if (queryError) {
      throw new Error(`Failed to get promotion candidates: ${queryError.message}`);
    }

    if (!candidates || candidates.length === 0) {
      logger.info('promote_no_candidates', {});
      return new Response(
        JSON.stringify({ success: true, promoted: 0, message: 'No candidates met thresholds' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 2. Fetch existing slugs to avoid duplicates
    const { data: existingSlugs } = await supabase
      .from('curated_searches')
      .select('slug, natural_query');

    const existingSet = new Set(
      (existingSlugs ?? []).flatMap((e: { slug: string; natural_query: string }) => [
        e.slug,
        e.natural_query.toLowerCase().trim(),
      ]),
    );

    // 3. Prepare new entries
    const newEntries: Array<{
      slug: string;
      title: string;
      description: string;
      scryfall_query: string;
      natural_query: string;
      category: string;
      source: string;
      priority: number;
    }> = [];

    for (const c of candidates) {
      if (newEntries.length >= MAX_PROMOTIONS) break;

      const query = (c.query as string).trim();
      const slug = slugify(query);

      // Skip if slug or query already exists
      if (!slug || existingSet.has(slug) || existingSet.has(query.toLowerCase())) continue;

      const category = inferCategory(query);
      const title = titleize(query);

      newEntries.push({
        slug,
        title,
        description: `Popular search: "${query}" — searched ${c.frequency} times with ${Math.round(c.avg_confidence * 100)}% average confidence.`,
        scryfall_query: (c.top_translation as string) || '',
        natural_query: query,
        category,
        source: 'auto',
        priority: AUTO_PRIORITY,
      });

      existingSet.add(slug);
      existingSet.add(query.toLowerCase());
    }

    if (newEntries.length === 0) {
      logger.info('promote_all_exist', { candidatesChecked: candidates.length });
      return new Response(
        JSON.stringify({ success: true, promoted: 0, message: 'All candidates already curated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 4. Insert new curated searches
    const { error: insertError } = await supabase
      .from('curated_searches')
      .insert(newEntries);

    if (insertError) {
      throw new Error(`Failed to insert curated searches: ${insertError.message}`);
    }

    const responseTimeMs = Date.now() - startTime;

    logger.info('promote_complete', {
      promoted: newEntries.length,
      candidatesChecked: candidates.length,
      responseTimeMs,
    });

    return new Response(
      JSON.stringify({
        success: true,
        promoted: newEntries.length,
        entries: newEntries.map((e) => ({ slug: e.slug, title: e.title, category: e.category })),
        responseTimeMs,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    logger.error('promote_error', { error: String(error), responseTimeMs });

    return new Response(
      JSON.stringify({ success: false, error: 'Promotion failed', responseTimeMs }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
