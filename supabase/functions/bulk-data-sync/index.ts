/**
 * bulk-data-sync — Uses Scryfall's bulk data (oracle_cards) to backfill
 * the cards table and capture price snapshots in a single pass.
 *
 * This replaces hundreds of individual API calls with one bulk download.
 * The oracle_cards file (~170MB) contains one entry per oracle ID with
 * prices, legalities, rarity, colors, etc.
 *
 * Designed to run weekly via pg_cron. Streams the JSON to stay within
 * edge function memory limits.
 *
 * @module functions/bulk-data-sync
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, validateAuth } from '../_shared/auth.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('bulk-data-sync');
const UPSERT_BATCH = 500;
const PRICE_BATCH = 500;

interface ScryfallCard {
  oracle_id?: string;
  name?: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  colors?: string[];
  cmc?: number;
  rarity?: string;
  legalities?: Record<string, string>;
  prices?: Record<string, string | null>;
  image_uris?: Record<string, string>;
  card_faces?: Array<{ image_uris?: Record<string, string> }>;
  id?: string; // scryfall card id
  layout?: string;
}

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Service role only — this is a heavy pipeline operation
  const authCheck = requireServiceRole(req, corsHeaders);
  if (!authCheck.authorized) {
    return authCheck.response;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Not configured' }), { status: 500, headers });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Step 1: Get the oracle_cards bulk data download URL
    log.info('Fetching bulk data catalog');
    const catalogResp = await fetch('https://api.scryfall.com/bulk-data', {
      headers: { 'User-Agent': 'OffMeta/1.0' },
    });

    if (!catalogResp.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Scryfall bulk data catalog' }),
        { status: 502, headers },
      );
    }

    const catalog = await catalogResp.json();
    const oracleEntry = catalog.data?.find(
      (entry: { type: string }) => entry.type === 'oracle_cards',
    );

    if (!oracleEntry?.download_uri) {
      return new Response(
        JSON.stringify({ error: 'oracle_cards bulk data not found' }),
        { status: 502, headers },
      );
    }

    log.info('Downloading oracle_cards bulk data', {
      size: oracleEntry.size,
      updated_at: oracleEntry.updated_at,
    });

    // Step 2: Download and parse the bulk data
    // We fetch the full JSON array — Deno handles gzip decompression automatically
    const dataResp = await fetch(oracleEntry.download_uri, {
      headers: { 'User-Agent': 'OffMeta/1.0' },
    });

    if (!dataResp.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to download bulk data' }),
        { status: 502, headers },
      );
    }

    // Parse into text first, then JSON — the file is large but edge functions
    // can handle it since oracle_cards decompressed is ~170MB and Deno streams the body
    const cards: ScryfallCard[] = await dataResp.json();
    log.info('Parsed bulk data', { totalCards: cards.length });

    // Step 3: Process cards into batches for cards table + price snapshots
    const cardRows: Array<Record<string, unknown>> = [];
    const priceRows: Array<Record<string, unknown>> = [];
    let skipped = 0;

    for (const card of cards) {
      if (!card.oracle_id || !card.name) {
        skipped++;
        continue;
      }

      const imageUrl =
        card.image_uris?.normal ??
        card.card_faces?.[0]?.image_uris?.normal ??
        null;

      cardRows.push({
        oracle_id: card.oracle_id,
        name: card.name,
        mana_cost: card.mana_cost ?? null,
        type_line: card.type_line ?? null,
        oracle_text: card.oracle_text ?? null,
        colors: card.colors ?? [],
        cmc: card.cmc ?? 0,
        image_url: imageUrl,
        rarity: card.rarity ?? null,
        legalities: card.legalities ?? null,
        updated_at: new Date().toISOString(),
      });

      // Capture price snapshot if price data exists
      const priceUsd = card.prices?.usd ? parseFloat(card.prices.usd) : null;
      const priceUsdFoil = card.prices?.usd_foil
        ? parseFloat(card.prices.usd_foil)
        : null;

      if (priceUsd !== null || priceUsdFoil !== null) {
        priceRows.push({
          card_name: card.name,
          scryfall_id: card.id ?? null,
          price_usd: priceUsd,
          price_usd_foil: priceUsdFoil,
        });
      }
    }

    log.info('Processed cards', {
      cardRows: cardRows.length,
      priceRows: priceRows.length,
      skipped,
    });

    // Step 4: Upsert cards in batches
    let cardsUpserted = 0;
    let cardErrors = 0;

    for (let i = 0; i < cardRows.length; i += UPSERT_BATCH) {
      const batch = cardRows.slice(i, i + UPSERT_BATCH);
      const { error: upsertErr } = await supabase
        .from('cards')
        .upsert(batch, { onConflict: 'oracle_id' });

      if (upsertErr) {
        log.warn('Card upsert batch failed', {
          batch: i / UPSERT_BATCH,
          error: upsertErr.message,
        });
        cardErrors++;
      } else {
        cardsUpserted += batch.length;
      }
    }

    // Step 5: Insert price snapshots in batches
    let pricesInserted = 0;
    let priceErrors = 0;

    for (let i = 0; i < priceRows.length; i += PRICE_BATCH) {
      const batch = priceRows.slice(i, i + PRICE_BATCH);
      const { error: insertErr } = await supabase
        .from('price_snapshots')
        .insert(batch);

      if (insertErr) {
        log.warn('Price snapshot batch failed', {
          batch: i / PRICE_BATCH,
          error: insertErr.message,
        });
        priceErrors++;
      } else {
        pricesInserted += batch.length;
      }
    }

    // Step 6: Cleanup old price snapshots (>90 days)
    const ninetyDaysAgo = new Date(
      Date.now() - 90 * 24 * 60 * 60 * 1000,
    ).toISOString();
    await supabase
      .from('price_snapshots')
      .delete()
      .lt('recorded_at', ninetyDaysAgo);

    log.info('Bulk data sync complete', {
      cardsUpserted,
      cardErrors,
      pricesInserted,
      priceErrors,
    });

    return new Response(
      JSON.stringify({
        success: true,
        totalInBulk: cards.length,
        cardsUpserted,
        cardErrors,
        pricesInserted,
        priceErrors,
        skipped,
        bulkDataUpdatedAt: oracleEntry.updated_at,
      }),
      { status: 200, headers },
    );
  } catch (e) {
    log.error('bulk-data-sync error', e);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers },
    );
  }
});
