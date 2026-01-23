/**
 * Generate Patterns Edge Function
 *
 * Analyzes translation_logs to find high-frequency, high-confidence queries
 * and creates translation_rules to bypass AI for future identical searches.
 *
 * Run manually or via cron to reduce AI costs over time.
 *
 * @module generate-patterns
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateAuth, getCorsHeaders } from '../_shared/auth.ts';
import { validateEnv } from '../_shared/env.ts';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = validateEnv([
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
]);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Minimum requirements for a query to become a pattern
const MIN_OCCURRENCES = 3;
const MIN_CONFIDENCE = 0.8;
const MAX_NEW_PATTERNS = 50;

/**
 * Normalizes a query for pattern matching (order-independent, lowercase)
 */
function normalizePattern(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\\w\\s]/g, '')
    .split(' ')
    .sort()
    .join(' ');
}

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
    // Get existing patterns to avoid duplicates
    const { data: existingRules, error: rulesError } = await supabase
      .from('translation_rules')
      .select('pattern');

    if (rulesError) {
      throw new Error(`Failed to fetch existing rules: ${rulesError.message}`);
    }

    const existingPatterns = new Set(
      (existingRules || []).map((r) => normalizePattern(r.pattern)),
    );

    console.log(`Found ${existingPatterns.size} existing patterns`);

    // Find high-frequency, high-confidence translations from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: logs, error: logsError } = await supabase
      .from('translation_logs')
      .select('natural_language_query, translated_query, confidence_score')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .gte('confidence_score', MIN_CONFIDENCE)
      .eq('fallback_used', false)
      .order('created_at', { ascending: false })
      .limit(5000);

    if (logsError) {
      throw new Error(`Failed to fetch logs: ${logsError.message}`);
    }

    if (!logs || logs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No qualifying logs found',
          patternsCreated: 0,
          timeMs: Date.now() - startTime,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(`Analyzing ${logs.length} translation logs`);

    // Count query frequencies and track best translation
    interface QueryData {
      count: number;
      bestTranslation: string;
      bestConfidence: number;
      originalQuery: string;
    }

    const queryFrequency = new Map<string, QueryData>();

    for (const log of logs) {
      const normalized = normalizePattern(log.natural_language_query);
      const existing = queryFrequency.get(normalized);

      if (existing) {
        existing.count++;
        // Keep the highest confidence translation
        if (log.confidence_score > existing.bestConfidence) {
          existing.bestTranslation = log.translated_query;
          existing.bestConfidence = log.confidence_score;
        }
      } else {
        queryFrequency.set(normalized, {
          count: 1,
          bestTranslation: log.translated_query,
          bestConfidence: log.confidence_score,
          originalQuery: log.natural_language_query,
        });
      }
    }

    // Filter to queries meeting minimum occurrences and not already patterns
    const candidates = Array.from(queryFrequency.entries())
      .filter(
        ([normalized, data]) =>
          data.count >= MIN_OCCURRENCES && !existingPatterns.has(normalized),
      )
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, MAX_NEW_PATTERNS);

    console.log(`Found ${candidates.length} candidates for new patterns`);

    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No new patterns to create',
          patternsCreated: 0,
          analyzed: logs.length,
          timeMs: Date.now() - startTime,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Create new translation rules
    const newRules = candidates.map(([_, data]) => ({
      pattern: data.originalQuery.toLowerCase().trim(),
      scryfall_syntax: data.bestTranslation,
      confidence: data.bestConfidence,
      description: `Auto-generated from ${data.count} occurrences`,
      is_active: true,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('translation_rules')
      .insert(newRules)
      .select('id, pattern');

    if (insertError) {
      throw new Error(`Failed to insert rules: ${insertError.message}`);
    }

    const patternsCreated = inserted?.length || 0;

    console.log(
      JSON.stringify({
        event: 'patterns_generated',
        patternsCreated,
        analyzed: logs.length,
        timeMs: Date.now() - startTime,
      }),
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${patternsCreated} new translation patterns`,
        patternsCreated,
        analyzed: logs.length,
        patterns: inserted?.map((r) => r.pattern) || [],
        timeMs: Date.now() - startTime,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Pattern generation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: String(error),
        timeMs: Date.now() - startTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
