/**
 * bulk-data-sync — Backfills the cards table and captures price snapshots
 * using Scryfall's paginated search API.
 *
 * Edge functions have ~150MB memory — Scryfall's bulk JSON (~170MB) exceeds
 * that even with streaming. Instead we paginate /cards/search (175 cards/page)
 * and process in chunks.
 *
 * Accepts optional `page` param (default 1). Each invocation processes up to
 * `MAX_PAGES` pages, then returns a `nextPage` cursor so the caller (or cron)
 * can continue.
 *
 * Weekly cron should call with page=1; the function will self-invoke for
 * subsequent batches.
 *
 * @module functions/bulk-data-sync
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, validateAuth } from '../_shared/auth.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('bulk-data-sync');
const UPSERT_BATCH = 200;
const MAX_PAGES = 20; // Process 20 pages (~3,500 cards) per invocation
const SCRYFALL_DELAY_MS = 100; // Respect rate limits

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

interface ScryfallSearchResponse {
  data?: ScryfallCard[];
  has_more?: boolean;
  next_page?: string;
  total_cards?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    // Parse starting page from request body
    let startPage = 1;
    let cleanupOld = false;
    try {
      const body = await req.json();
      if (body.page && typeof body.page === 'number') startPage = body.page;
      if (body.cleanup === true) cleanupOld = true;
    } catch {
      // default page 1
    }

    log.info('Starting bulk-data-sync', { startPage, maxPages: MAX_PAGES });

    // Use Scryfall search with unique:prints to get all oracle cards
    // q=* returns all cards; unique:cards deduplicates by oracle_id
    let nextPageUrl: string | null =
      `https://api.scryfall.com/cards/search?q=*&unique=cards&order=name&page=${startPage}`;

    let pagesProcessed = 0;
    let cardsUpserted = 0;
    let cardErrors = 0;
    let pricesInserted = 0;
    let priceErrors = 0;
    let skipped = 0;
    let totalCards = 0;
    let hasMore = false;
    let currentPage = startPage;

    while (nextPageUrl && pagesProcessed < MAX_PAGES) {
      await sleep(SCRYFALL_DELAY_MS);

      const resp = await fetch(nextPageUrl, {
        headers: { 'User-Agent': 'OffMeta/1.0' },
      });

      if (!resp.ok) {
        const errText = await resp.text();
        log.warn('Scryfall search failed', { page: currentPage, status: resp.status, error: errText.slice(0, 200) });
        break;
      }

      const result: ScryfallSearchResponse = await resp.json();
      const cards = result.data ?? [];
      totalCards += cards.length;

      // Process cards into batches
      const cardRows: Array<Record<string, unknown>> = [];
      const priceRows: Array<Record<string, unknown>> = [];

      for (const card of cards) {
        const { cardRow, priceRow } = processCard(card);
        if (cardRow) {
          cardRows.push(cardRow);
          if (priceRow) priceRows.push(priceRow);
        } else {
          skipped++;
        }
      }

      // Upsert cards
      for (let i = 0; i < cardRows.length; i += UPSERT_BATCH) {
        const batch = cardRows.slice(i, i + UPSERT_BATCH);
        const { error: upsertErr } = await supabase
          .from('cards')
          .upsert(batch, { onConflict: 'oracle_id' });
        if (upsertErr) {
          log.warn('Card upsert batch failed', { error: upsertErr.message });
          cardErrors++;
        } else {
          cardsUpserted += batch.length;
        }
      }

      // Insert price snapshots
      for (let i = 0; i < priceRows.length; i += UPSERT_BATCH) {
        const batch = priceRows.slice(i, i + UPSERT_BATCH);
        const { error: insertErr } = await supabase
          .from('price_snapshots')
          .insert(batch);
        if (insertErr) {
          log.warn('Price snapshot batch failed', { error: insertErr.message });
          priceErrors++;
        } else {
          pricesInserted += batch.length;
        }
      }

      pagesProcessed++;
      currentPage++;
      hasMore = result.has_more === true;
      nextPageUrl = hasMore ? result.next_page ?? null : null;

      if (pagesProcessed % 5 === 0) {
        log.info('Progress', { pagesProcessed, cardsUpserted, pricesInserted, currentPage });
      }
    }

    // Cleanup old price snapshots on first batch only
    if (startPage === 1 || cleanupOld) {
      const ninetyDaysAgo = new Date(
        Date.now() - 90 * 24 * 60 * 60 * 1000,
      ).toISOString();
      await supabase
        .from('price_snapshots')
        .delete()
        .lt('recorded_at', ninetyDaysAgo);
    }

    // Self-invoke for next batch if there are more pages
    if (hasMore && nextPageUrl) {
      log.info('Scheduling next batch', { nextPage: currentPage });
      // Fire-and-forget the next batch
      fetch(`${supabaseUrl}/functions/v1/bulk-data-sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ page: currentPage }),
      }).catch((err) => {
        log.warn('Failed to self-invoke next batch', { error: String(err) });
      });
    }

    log.info('Batch complete', {
      startPage,
      pagesProcessed,
      cardsUpserted,
      cardErrors,
      pricesInserted,
      priceErrors,
      skipped,
      hasMore,
    });

    return new Response(
      JSON.stringify({
        success: true,
        startPage,
        pagesProcessed,
        totalCardsInBatch: totalCards,
        cardsUpserted,
        cardErrors,
        pricesInserted,
        priceErrors,
        skipped,
        hasMore,
        nextPage: hasMore ? currentPage : null,
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
