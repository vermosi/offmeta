/**
 * card-printings-sync — Backfills the card_printings table from MTGJSON.
 *
 * MTGJSON is the better architectural source for printing-level data because it
 * aggregates all printings into a set-oriented dataset. That lets the deck
 * builder and card modals read printings locally without issuing live Scryfall
 * search requests for every popup.
 *
 * The function ingests MTGJSON AllPrintings in batches, upserts rows into
 * `card_printings`, and can be scheduled weekly.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, requireServiceOrPipelineKey } from '../_shared/auth.ts';
import { createLogger, withLogging } from '../_shared/logger.ts';

const log = createLogger('card-printings-sync');
const UPSERT_BATCH = 250;
const MTGJSON_ALL_PRINTINGS_URL = 'https://mtgjson.com/api/v5/AllPrintings.json';

type JsonObject = Record<string, unknown>;

interface MtgjsonSetCard {
  uuid?: string;
  name?: string;
  number?: string;
  rarity?: string;
  artist?: string;
  prices?: JsonObject;
  purchaseUrls?: JsonObject;
  identifiers?: JsonObject;
  relatedCards?: JsonObject;
}

interface MtgjsonSet {
  code?: string;
  name?: string;
  releaseDate?: string;
  cards?: MtgjsonSetCard[];
}

interface MtgjsonAllPrintings {
  meta?: JsonObject;
  data?: Record<string, MtgjsonSet>;
}

function toStringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function normalizePriceShape(prices: JsonObject | undefined): JsonObject | null {
  if (!prices) return null;
  const normalized: JsonObject = {};
  for (const [key, value] of Object.entries(prices)) {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      normalized[key] = value;
    }
  }
  return Object.keys(normalized).length > 0 ? normalized : null;
}

function normalizeJsonObject(value: unknown): JsonObject | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as JsonObject;
}

function processCard(
  setCode: string,
  setName: string,
  releaseDate: string | null,
  card: MtgjsonSetCard,
): Record<string, unknown> | null {
  const rawName = toStringOrEmpty(card.name);
  const uuid = toStringOrEmpty(card.uuid);
  if (!uuid || !rawName) return null;

  const identifiers = normalizeJsonObject(card.identifiers);
  const scryfallId = toStringOrNull(identifiers?.scryfallId) ?? uuid;
  const relatedCards = normalizeJsonObject(card.relatedCards);

  return {
    id: scryfallId,
    oracle_id: scryfallId,
    scryfall_id: scryfallId,
    mtgjson_uuid: uuid,
    name: rawName,
    set: setCode,
    set_name: setName,
    collector_number: toStringOrEmpty(card.number),
    rarity: toStringOrNull(card.rarity),
    artist: toStringOrNull(card.artist),
    prices: normalizePriceShape(card.prices),
    image_url: null,
    purchase_uris: normalizeJsonObject(card.purchaseUrls),
    identifiers,
    related_cards: relatedCards,
    released_at: releaseDate,
    lang: 'en',
    updated_at: new Date().toISOString(),
  };
}

serve(withLogging('card-printings-sync', async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authCheck = await requireServiceOrPipelineKey(req, corsHeaders);
  if (!authCheck.authorized) return authCheck.response;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Not configured' }), {
      status: 500,
      headers,
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const response = await fetch(MTGJSON_ALL_PRINTINGS_URL, {
      headers: { 'User-Agent': 'OffMeta/1.0' },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `MTGJSON AllPrintings fetch failed: ${response.status} ${body.slice(0, 200)}`,
      );
    }

    const payload = (await response.json()) as MtgjsonAllPrintings;
    const sets = payload.data ?? {};
    const rows: Record<string, unknown>[] = [];
    let setCount = 0;
    let cardCount = 0;

    for (const [setCode, setData] of Object.entries(sets)) {
      const setName = setData.name ?? setCode;
      const releaseDate = toStringOrNull(setData.releaseDate);
      const cards = setData.cards ?? [];
      setCount++;

      for (const card of cards) {
        const row = processCard(setCode, setName, releaseDate, card);
        if (row) {
          rows.push(row);
          cardCount++;
        }
      }
    }

    let upserted = 0;
    let errors = 0;
    for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
      const batch = rows.slice(i, i + UPSERT_BATCH);
      const { error } = await supabase
        .from('card_printings')
        .upsert(batch, { onConflict: 'id' });
      if (error) {
        log.warn('card_printings batch upsert failed', { batch: i / UPSERT_BATCH, error: error.message });
        errors++;
      } else {
        upserted += batch.length;
      }
    }

    log.info('card-printings-sync complete', {
      setCount,
      cardCount,
      upserted,
      errors,
    });

    return new Response(
      JSON.stringify({
        success: true,
        setCount,
        cardCount,
        upserted,
        errors,
      }),
      { status: 200, headers },
    );
  } catch (e) {
    log.error('card-printings-sync error', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers,
    });
  }
}));
