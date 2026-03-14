/**
 * bulk-data-sync — Uses Scryfall's bulk data (oracle_cards) to backfill
 * the cards table and capture price snapshots in a single pass.
 *
 * Streams the JSON array to stay within edge function memory limits
 * by parsing one card object at a time using bracket-counting.
 *
 * Designed to run weekly via pg_cron.
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
  id?: string;
  layout?: string;
}

/** Process a single Scryfall card into card + price row objects */
function processCard(card: ScryfallCard): {
  cardRow: Record<string, unknown> | null;
  priceRow: Record<string, unknown> | null;
} {
  if (!card.oracle_id || !card.name) {
    return { cardRow: null, priceRow: null };
  }

  const imageUrl =
    card.image_uris?.normal ??
    card.card_faces?.[0]?.image_uris?.normal ??
    null;

  const cardRow: Record<string, unknown> = {
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
  };

  const priceUsd = card.prices?.usd ? parseFloat(card.prices.usd) : null;
  const priceUsdFoil = card.prices?.usd_foil
    ? parseFloat(card.prices.usd_foil)
    : null;

  let priceRow: Record<string, unknown> | null = null;
  if (priceUsd !== null || priceUsdFoil !== null) {
    priceRow = {
      card_name: card.name,
      scryfall_id: card.id ?? null,
      price_usd: priceUsd,
      price_usd_foil: priceUsdFoil,
    };
  }

  return { cardRow, priceRow };
}

/**
 * Streaming JSON array parser.
 * Reads a ReadableStream of bytes representing a top-level JSON array
 * and yields each element (object) as a parsed value.
 * Uses bracket counting — no need to load the full array into memory.
 */
async function* streamJsonArray(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<ScryfallCard> {
  const decoder = new TextDecoder();
  const reader = body.getReader();

  let buffer = '';
  let depth = 0;
  let inString = false;
  let escape = false;
  let objectStart = -1;
  let started = false; // have we passed the opening '['?

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    for (let i = 0; i < buffer.length; i++) {
      const ch = buffer[i];

      if (escape) {
        escape = false;
        continue;
      }

      if (ch === '\\' && inString) {
        escape = true;
        continue;
      }

      if (ch === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (!started) {
        if (ch === '[') {
          started = true;
        }
        continue;
      }

      if (ch === '{') {
        if (depth === 0) {
          objectStart = i;
        }
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0 && objectStart !== -1) {
          const jsonStr = buffer.slice(objectStart, i + 1);
          objectStart = -1;
          try {
            yield JSON.parse(jsonStr) as ScryfallCard;
          } catch {
            // skip malformed objects
          }
        }
      }
    }

    // Keep only unprocessed remainder in buffer
    if (objectStart !== -1) {
      buffer = buffer.slice(objectStart);
      objectStart = 0;
    } else {
      buffer = '';
    }
  }
}

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await validateAuth(req);
  if (!auth.authorized) {
    return new Response(JSON.stringify({ error: auth.error }), { status: 401, headers });
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

    log.info('Downloading oracle_cards bulk data (streaming)', {
      size: oracleEntry.size,
      updated_at: oracleEntry.updated_at,
    });

    // Step 2: Stream and process the bulk data
    const dataResp = await fetch(oracleEntry.download_uri, {
      headers: { 'User-Agent': 'OffMeta/1.0' },
    });

    if (!dataResp.ok || !dataResp.body) {
      return new Response(
        JSON.stringify({ error: 'Failed to download bulk data' }),
        { status: 502, headers },
      );
    }

    // Process cards via streaming — batches are flushed as we go
    const cardBatch: Array<Record<string, unknown>> = [];
    const priceBatch: Array<Record<string, unknown>> = [];
    let totalCards = 0;
    let skipped = 0;
    let cardsUpserted = 0;
    let cardErrors = 0;
    let pricesInserted = 0;
    let priceErrors = 0;

    const flushCards = async () => {
      if (cardBatch.length === 0) return;
      const batch = cardBatch.splice(0, cardBatch.length);
      const { error: upsertErr } = await supabase
        .from('cards')
        .upsert(batch, { onConflict: 'oracle_id' });
      if (upsertErr) {
        log.warn('Card upsert batch failed', { error: upsertErr.message });
        cardErrors++;
      } else {
        cardsUpserted += batch.length;
      }
    };

    const flushPrices = async () => {
      if (priceBatch.length === 0) return;
      const batch = priceBatch.splice(0, priceBatch.length);
      const { error: insertErr } = await supabase
        .from('price_snapshots')
        .insert(batch);
      if (insertErr) {
        log.warn('Price snapshot batch failed', { error: insertErr.message });
        priceErrors++;
      } else {
        pricesInserted += batch.length;
      }
    };

    for await (const card of streamJsonArray(dataResp.body)) {
      totalCards++;
      const { cardRow, priceRow } = processCard(card);

      if (!cardRow) {
        skipped++;
        continue;
      }

      cardBatch.push(cardRow);
      if (priceRow) priceBatch.push(priceRow);

      // Flush when batch size reached
      if (cardBatch.length >= UPSERT_BATCH) await flushCards();
      if (priceBatch.length >= PRICE_BATCH) await flushPrices();

      // Log progress every 5000 cards
      if (totalCards % 5000 === 0) {
        log.info('Processing progress', { totalCards, cardsUpserted, pricesInserted });
      }
    }

    // Flush remaining
    await flushCards();
    await flushPrices();

    // Step 3: Cleanup old price snapshots (>90 days)
    const ninetyDaysAgo = new Date(
      Date.now() - 90 * 24 * 60 * 60 * 1000,
    ).toISOString();
    await supabase
      .from('price_snapshots')
      .delete()
      .lt('recorded_at', ninetyDaysAgo);

    log.info('Bulk data sync complete', {
      totalCards,
      cardsUpserted,
      cardErrors,
      pricesInserted,
      priceErrors,
      skipped,
    });

    return new Response(
      JSON.stringify({
        success: true,
        totalInBulk: totalCards,
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
