/**
 * sync-card-names — Populates card_names table from Scryfall catalog API
 *
 * Uses the lightweight /catalog/card-names endpoint (~30k names, ~500KB)
 * instead of bulk data (~80MB). Designed to run weekly via pg_cron.
 *
 * @module functions/sync-card-names
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, validateAuth } from '../_shared/auth.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('sync-card-names');
const SCRYFALL_CATALOG_URL = 'https://api.scryfall.com/catalog/card-names';
const BATCH_SIZE = 1000;

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only service role can trigger this
  const auth = requireServiceRole(req, corsHeaders);
  if (!auth.authorized) {
    return auth.response;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Not configured' }), { status: 500, headers });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Fetch all card names from Scryfall catalog
    log.info('fetching_catalog', { url: SCRYFALL_CATALOG_URL });
    const response = await fetch(SCRYFALL_CATALOG_URL, {
      headers: { 'User-Agent': 'OffMeta/1.0' },
    });

    if (!response.ok) {
      const body = await response.text();
      log.error('scryfall_catalog_failed', { status: response.status, body: body.slice(0, 200) });
      return new Response(
        JSON.stringify({ error: 'Scryfall catalog fetch failed', status: response.status }),
        { status: 502, headers },
      );
    }

    const catalog = await response.json();
    const names: string[] = catalog.data;

    if (!Array.isArray(names) || names.length === 0) {
      log.error('empty_catalog', { totalCards: catalog.total_values });
      return new Response(
        JSON.stringify({ error: 'Empty catalog response' }),
        { status: 502, headers },
      );
    }

    log.info('catalog_fetched', { totalNames: names.length });

    // Upsert in batches
    let upserted = 0;
    let errors = 0;

    for (let i = 0; i < names.length; i += BATCH_SIZE) {
      const batch = names.slice(i, i + BATCH_SIZE).map((name) => ({
        name_lower: name.toLowerCase(),
        name,
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertErr } = await supabase
        .from('card_names')
        .upsert(batch, { onConflict: 'name_lower', ignoreDuplicates: false });

      if (upsertErr) {
        log.error('batch_upsert_failed', { batch: i / BATCH_SIZE, error: upsertErr.message });
        errors++;
      } else {
        upserted += batch.length;
      }
    }

    log.info('sync_complete', { upserted, errors, totalNames: names.length });

    return new Response(
      JSON.stringify({
        success: true,
        totalNames: names.length,
        upserted,
        errors,
      }),
      { headers },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error('sync_failed', { error: message });
    return new Response(
      JSON.stringify({ error: 'Internal error', detail: message }),
      { status: 500, headers },
    );
  }
});
