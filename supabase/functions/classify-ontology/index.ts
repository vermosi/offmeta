/**
 * Classify Ontology Edge Function
 *
 * Runs the deterministic card ontology classifier. The rules themselves live
 * in `public.ontology_tags` and the matching runs entirely inside
 * `public.classify_card_ontology()`, so this function is only the operational
 * surface: authorisation, a job lease, and reporting.
 *
 * Keeping the rules in the database means there is exactly one source of
 * truth — no rule set duplicated between the client, the edge runtime and SQL
 * that could drift apart and produce different tags for the same card.
 *
 * Modes:
 *   - default: incremental, only cards whose row changed in the last 48h
 *   - `{ "full": true }`: reclassify the entire card pool (use after a rule
 *     change, since a removed rule must also drop its old assignments)
 *
 * @module classify-ontology
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, requireServiceOrPipelineKey } from '../_shared/auth.ts';
import { validateEnv } from '../_shared/env.ts';
import { createLogger, withLogging } from '../_shared/logger.ts';
import { acquireJobLock, lockBusyResponse } from '../_shared/jobLock.ts';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = validateEnv([
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
]);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const logger = createLogger('classify-ontology');

/** Incremental runs only look at cards touched by the recent bulk sync. */
const INCREMENTAL_WINDOW_HOURS = 48;
/** A full pass over ~32k cards is comfortably inside this lease. */
const LOCK_TTL_SECONDS = 900;

interface ClassifyResult {
  cards_processed: number;
  tags_assigned: number;
  ran_at: string;
}

interface RequestBody {
  full?: boolean;
  limit?: number;
}

serve(
  withLogging('classify-ontology', async (req) => {
    const corsHeaders = getCorsHeaders(req);
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const authCheck = await requireServiceOrPipelineKey(req, corsHeaders);
    if (!authCheck.authorized) return authCheck.response;

    const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

    let body: RequestBody = {};
    try {
      body = (await req.clone().json()) as RequestBody;
    } catch {
      // No body is a valid incremental run.
    }

    const lease = await acquireJobLock('classify-ontology', LOCK_TTL_SECONDS);
    if (!lease.acquired) return lockBusyResponse('classify-ontology', jsonHeaders);

    const startedAt = Date.now();

    try {
      const since = body.full
        ? null
        : new Date(Date.now() - INCREMENTAL_WINDOW_HOURS * 3600_000).toISOString();

      const { data, error } = await supabase.rpc('classify_card_ontology', {
        p_limit: typeof body.limit === 'number' ? body.limit : null,
        p_since: since,
      });

      if (error) throw new Error(`classify_card_ontology failed: ${error.message}`);

      const result = data as ClassifyResult;
      logger.info('classify_completed', {
        mode: body.full ? 'full' : 'incremental',
        cards: result?.cards_processed ?? 0,
        tags: result?.tags_assigned ?? 0,
        durationMs: Date.now() - startedAt,
      });

      return new Response(
        JSON.stringify({
          success: true,
          mode: body.full ? 'full' : 'incremental',
          ...result,
          duration_ms: Date.now() - startedAt,
        }),
        { headers: jsonHeaders },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('classify_failed', { message });
      return new Response(JSON.stringify({ success: false, error: message }), {
        status: 500,
        headers: jsonHeaders,
      });
    } finally {
      await lease.release();
    }
  }),
);
