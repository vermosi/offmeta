import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, requireServiceOrPipelineKey } from '../_shared/auth.ts';
import { createLogger, withLogging } from '../_shared/logger.ts';

const log = createLogger('card-printings-sync');
const MTGJSON_BASE_URL = 'https://mtgjson.com/api/v5';
const SETS_PER_BATCH = 10;

type SetListResponse = {
  data?: Array<{ code?: string; name?: string }>;
};

type MtgjsonSetCard = {
  uuid: string;
  scryfallId?: string;
  identifiers?: {
    scryfallId?: string;
    scryfallOracleId?: string;
    mtgjsonV4Id?: string;
  };
  name: string;
  collectorNumber: string;
  rarity?: string;
  artist?: string;
  prices?: {
    usd?: string;
    usdFoil?: string;
    eur?: string;
    eurFoil?: string;
    tix?: string;
  };
  purchaseUrls?: {
    tcgplayer?: string;
    cardmarket?: string;
    cardKingdom?: string;
    cardKingdomFoil?: string;
  };
  relatedCards?: Record<string, unknown> | null;
  releasedAt?: string;
  language?: string;
};

type MtgjsonSetData = {
  code: string;
  name: string;
  cards?: MtgjsonSetCard[];
};

function mapCard(set: MtgjsonSetData, card: MtgjsonSetCard) {
  const oracleId =
    card.identifiers?.scryfallOracleId ??
    card.identifiers?.mtgjsonV4Id ??
    card.identifiers?.scryfallId ??
    card.uuid;

  return {
    id: card.uuid,
    scryfall_id: card.identifiers?.scryfallId ?? card.scryfallId ?? null,
    mtgjson_uuid: card.uuid,
    oracle_id: oracleId,
    name: card.name,
    set: set.code,
    set_name: set.name,
    collector_number: card.collectorNumber,
    rarity: card.rarity ?? null,
    artist: card.artist ?? null,
    prices: card.prices
      ? {
          usd: card.prices.usd,
          usd_foil: card.prices.usdFoil,
          eur: card.prices.eur,
          eur_foil: card.prices.eurFoil,
          tix: card.prices.tix,
        }
      : null,
    image_url: null,
    purchase_uris: card.purchaseUrls
      ? {
          tcgplayer: card.purchaseUrls.tcgplayer,
          cardmarket: card.purchaseUrls.cardmarket,
          cardKingdom: card.purchaseUrls.cardKingdom,
          cardKingdomFoil: card.purchaseUrls.cardKingdomFoil,
        }
      : null,
    identifiers: card.identifiers ? { ...card.identifiers } : null,
    related_cards: card.relatedCards ? { ...card.relatedCards } : null,
    released_at: card.releasedAt ?? null,
    lang: card.language ?? 'en',
    updated_at: new Date().toISOString(),
  };
}

serve(
  withLogging('card-printings-sync', async (req: Request): Promise<Response> => {
    const corsHeaders = getCorsHeaders(req);
    const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const authCheck = await requireServiceOrPipelineKey(req, corsHeaders);
    if (!authCheck.authorized) return authCheck.response;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const page = Number(body?.page ?? 1);
    const start = Math.max(0, (page - 1) * SETS_PER_BATCH);

    try {
      const setListResp = await fetch(`${MTGJSON_BASE_URL}/SetList.json`);
      if (!setListResp.ok) {
        return new Response(JSON.stringify({ error: 'Failed to load MTGJSON set list' }), {
          status: 502,
          headers,
        });
      }

      const setList = (await setListResp.json()) as SetListResponse;
      const codes = (setList.data ?? [])
        .map((set) => set.code?.trim())
        .filter((code): code is string => Boolean(code));
      const batch = codes.slice(start, start + SETS_PER_BATCH);

      let upserted = 0;
      const priceRows: Array<{
        card_name: string;
        scryfall_id: string | null;
        source: string;
        price_usd: number | null;
        price_usd_foil: number | null;
      }> = [];
      for (const code of batch) {
        const setResp = await fetch(`${MTGJSON_BASE_URL}/${code}.json`);
        if (!setResp.ok) {
          log.warn('mtgjson_set_failed', { code, status: setResp.status });
          continue;
        }

        const setData = (await setResp.json()) as MtgjsonSetData;
        const rows = (setData.cards ?? []).map((card) => mapCard(setData, card));

        if (rows.length === 0) continue;

        for (const row of rows) {
          if (row.prices?.usd == null && row.prices?.usd_foil == null) continue;
          priceRows.push({
            card_name: row.name,
            scryfall_id: row.scryfall_id,
            source: 'mtgjson',
            price_usd: row.prices?.usd ? Number(row.prices.usd) : null,
            price_usd_foil: row.prices?.usd_foil ? Number(row.prices.usd_foil) : null,
          });
        }

        const { error } = await supabase
          .from('card_printings')
          .upsert(rows, { onConflict: 'id' });

        if (error) {
          log.warn('card_printings_upsert_failed', { code, error: error.message });
          continue;
        }

        upserted += rows.length;
      }

      for (let i = 0; i < priceRows.length; i += 500) {
        const chunk = priceRows.slice(i, i + 500);
        const { error } = await supabase.from('price_snapshots').insert(chunk);
        if (error) log.warn('price_snapshot_insert_failed', { error: error.message });
      }

      const hasMore = start + SETS_PER_BATCH < codes.length;
      if (hasMore) {
        fetch(`${supabaseUrl}/functions/v1/card-printings-sync`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ page: page + 1 }),
        }).catch((error) => log.warn('card_printings_sync_continue_failed', { error: String(error) }));
      }

      return new Response(
        JSON.stringify({
          success: true,
          page,
          setsProcessed: batch.length,
          upserted,
          hasMore,
        }),
        { status: 200, headers },
      );
    } catch (error) {
      log.error('card_printings_sync_failed', error);
      return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers });
    }
  }),
);
