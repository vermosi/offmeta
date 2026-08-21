/**
 * Rules Glossary Sync
 *
 * Ingests the Magic: The Gathering Comprehensive Rules glossary
 * (https://yawgatog.com/resources/magic-rules/) into `public.rules_glossary`
 * so the search pipeline can ground player phrasing in official rules
 * semantics ("amass", "deathtouch", "sacrifice", "mana burn", ...).
 *
 * The CR changes a few times a year, so this runs monthly. It is bounded
 * (single fetch, batched upserts), single-flight (job lease) and idempotent
 * (upsert on slug).
 *
 * @module rules-glossary-sync
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, requireServiceOrPipelineKey } from '../_shared/auth.ts';
import { validateEnv } from '../_shared/env.ts';
import { createLogger } from '../_shared/logger.ts';
import { acquireJobLock, lockBusyResponse } from '../_shared/jobLock.ts';
import { parseGlossary } from '../_shared/cr-glossary-parse.ts';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = validateEnv([
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
]);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const logger = createLogger('rules-glossary-sync');

const SOURCE_URL = 'https://yawgatog.com/resources/magic-rules/';
const FETCH_TIMEOUT_MS = 30_000;
/** Fewer entries than this means the page markup changed — refuse to overwrite. */
const MIN_EXPECTED_ENTRIES = 400;
const BATCH_SIZE = 200;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const auth = await requireServiceOrPipelineKey(req, corsHeaders);
  if (!auth.authorized) return auth.response;

  const lease = await acquireJobLock('rules-glossary-sync', 600);
  if (!lease.acquired) return lockBusyResponse('rules-glossary-sync', jsonHeaders);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let html: string;
    try {
      const res = await fetch(SOURCE_URL, {
        headers: {
          'User-Agent': 'OffMeta/1.0 (+https://offmeta.app)',
          Accept: 'text/html',
        },
        signal: controller.signal,
      });
      if (!res.ok) {
        logger.warn('source_fetch_failed', { status: res.status });
        return new Response(
          JSON.stringify({ error: 'source_fetch_failed', status: res.status }),
          { status: 502, headers: jsonHeaders },
        );
      }
      html = await res.text();
    } finally {
      clearTimeout(timer);
    }

    const entries = parseGlossary(html);
    if (entries.length < MIN_EXPECTED_ENTRIES) {
      logger.warn('parse_below_threshold', { parsed: entries.length });
      return new Response(
        JSON.stringify({ error: 'parse_below_threshold', parsed: entries.length }),
        { status: 422, headers: jsonHeaders },
      );
    }

    let upserted = 0;
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const rows = entries.slice(i, i + BATCH_SIZE).map((e) => ({
        slug: e.slug,
        term: e.term,
        term_lower: e.termLower,
        definition: e.definition,
        category: e.category,
        rule_refs: e.ruleRefs,
        scryfall_hint: e.scryfallHint,
        source: 'yawgatog_cr',
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from('rules_glossary')
        .upsert(rows, { onConflict: 'slug' });
      if (error) {
        logger.error('upsert_failed', { message: error.message, offset: i });
        return new Response(
          JSON.stringify({ error: 'upsert_failed', message: error.message, upserted }),
          { status: 500, headers: jsonHeaders },
        );
      }
      upserted += rows.length;
    }

    logger.info('sync_complete', { parsed: entries.length, upserted });
    return new Response(
      JSON.stringify({ success: true, parsed: entries.length, upserted }),
      { headers: jsonHeaders },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('sync_failed', { message });
    return new Response(JSON.stringify({ error: 'sync_failed', message }), {
      status: 500,
      headers: jsonHeaders,
    });
  } finally {
    await lease.release();
  }
});
