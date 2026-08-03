/**
 * mtgjson-price-history-sync - Maintains MTGJSON price snapshots.
 *
 * Scan mode keeps the catalog warm with the daily MTGJSON feed.
 * Historical catch-up stays in the local script, which can use the larger
 * MTGJSON archive out of band.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, requireServiceOrPipelineKey } from '../_shared/auth.ts';
import { createLogger, withLogging } from '../_shared/logger.ts';

const log = createLogger('mtgjson-price-history-sync');
const MTGJSON_BASE_URL = 'https://mtgjson.com/api/v5';

type MtgjsonPriceTree = Record<string, unknown>;

type PriceSnapshotRow = {
  card_name: string;
  scryfall_id: string | null;
  source: string;
  price_usd: number | null;
  price_usd_foil: number | null;
  price_low: number | null;
  price_average: number | null;
  price_market: number | null;
  price_foil: number | null;
  recorded_at: string;
};

type CardPrintingRow = {
  name: string;
  mtgjson_uuid: string;
};

function sliceLastDays(map: Record<string, number> | undefined, days: number) {
  return Object.entries(map ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-days)
    .map(([date, price]) => ({ date, price }));
}

function getPath(obj: MtgjsonPriceTree, path: string): Record<string, number> | undefined {
  return path
    .split('.')
    .reduce(
      (acc: unknown, key) => (acc as Record<string, unknown> | undefined)?.[key],
      obj,
    ) as Record<string, number> | undefined;
}

function buildSnapshotRows(
  current: MtgjsonPriceTree,
  cardName: string,
  uuid: string,
  days: number,
): PriceSnapshotRow[] {
  const low = sliceLastDays(getPath(current, 'paper.cardmarket.retail.normal'), days);
  const average = sliceLastDays(getPath(current, 'paper.cardkingdom.retail.normal'), days);
  const market = sliceLastDays(getPath(current, 'paper.tcgplayer.retail.normal'), days);
  const foil = sliceLastDays(getPath(current, 'paper.tcgplayer.retail.foil'), days);

  return market.map((entry, index) => ({
    card_name: cardName,
    scryfall_id: uuid,
    source: 'mtgjson',
    price_usd: market[index]?.price ?? null,
    price_usd_foil: foil[index]?.price ?? null,
    price_low: low[index]?.price ?? null,
    price_average: average[index]?.price ?? null,
    price_market: market[index]?.price ?? null,
    price_foil: foil[index]?.price ?? null,
    recorded_at: `${entry.date}T00:00:00.000Z`,
  }));
}

async function getScanBatch(
  supabase: ReturnType<typeof createClient>,
  limit: number,
  offset: number,
): Promise<CardPrintingRow[]> {
  const { data, error } = await supabase
    .from('card_printings')
    .select('name, mtgjson_uuid')
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error || !data) return [];
  return data as CardPrintingRow[];
}

async function getExistingHistoryNames(
  supabase: ReturnType<typeof createClient>,
  cardNames: string[],
): Promise<Set<string>> {
  const existing = new Set<string>();
  for (let i = 0; i < cardNames.length; i += 100) {
    const batch = cardNames.slice(i, i + 100);
    const { data, error } = await supabase
      .from('price_snapshots')
      .select('card_name')
      .in('card_name', batch)
      .eq('source', 'mtgjson')
      .limit(batch.length);

    if (error || !data) continue;
    for (const row of data) existing.add(row.card_name);
  }
  return existing;
}

serve(
  withLogging('mtgjson-price-history-sync', async (req: Request): Promise<Response> => {
    const corsHeaders = getCorsHeaders(req);
    const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    const authCheck = await requireServiceOrPipelineKey(req, corsHeaders);
    if (!authCheck.authorized) return authCheck.response;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const cardNames = Array.isArray(body.cardNames)
      ? body.cardNames.filter((name): name is string => typeof name === 'string')
      : typeof body.cardName === 'string'
        ? [body.cardName.trim()]
        : [];
    const scan = body.scan !== false && cardNames.length === 0;
    const days = Number(body.days ?? 7) || 7;
    const batchSize = Math.max(1, Math.min(Number(body.batchSize ?? 50) || 50, 100));
    const offset = Math.max(0, Number(body.offset ?? 0) || 0);

    try {
      if (!scan) {
        return new Response(
          JSON.stringify({
            success: true,
            mode: 'targeted-disabled',
            message:
              'Use the local backfill script for historical catch-up; the edge job runs scan mode only.',
          }),
          { status: 200, headers },
        );
      }

      const batch = await getScanBatch(supabase, batchSize, offset);
      const unique = new Map<string, string>();
      for (const row of batch) {
        if (!unique.has(row.name) && row.mtgjson_uuid) unique.set(row.name, row.mtgjson_uuid);
      }

      const names = Array.from(unique.keys());
      const existing = await getExistingHistoryNames(supabase, names);
      const uuidMap = new Map(Array.from(unique.entries()).filter(([name]) => !existing.has(name)));
      const missing = names.filter((name) => existing.has(name));

      if (uuidMap.size === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            mode: 'scan',
            results: [],
            missing,
            scanned: names.length,
            inserted: 0,
            nextOffset: offset + names.length,
          }),
          { status: 200, headers },
        );
      }

      const pricesResp = await fetch(`${MTGJSON_BASE_URL}/AllPricesToday.json.gz`);
      if (!pricesResp.ok || !pricesResp.body) {
        return new Response(JSON.stringify({ error: 'Failed to load MTGJSON prices' }), {
          status: 502,
          headers,
        });
      }

      const decompressed = pricesResp.body.pipeThrough(new DecompressionStream('gzip'));
      const text = await new Response(decompressed).text();
      const parsed = JSON.parse(text) as Record<string, MtgjsonPriceTree>;

      const rows: PriceSnapshotRow[] = [];
      const results: Array<{ cardName: string; uuid: string; inserted: number }> = [];

      for (const [cardName, uuid] of uuidMap.entries()) {
        const current = parsed[uuid];
        if (!current) {
          missing.push(cardName);
          continue;
        }

        const itemRows = buildSnapshotRows(current, cardName, uuid, days);
        rows.push(...itemRows);
        results.push({ cardName, uuid, inserted: itemRows.length });
      }

      if (rows.length > 0) {
        const { error } = await supabase
          .from('price_snapshots')
          .upsert(rows, { onConflict: 'card_name,source,recorded_at' });
        if (error) throw error;
      }

      if (names.length === batchSize) {
        fetch(`${supabaseUrl}/functions/v1/mtgjson-price-history-sync`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ scan: true, days, batchSize, offset: offset + names.length }),
        }).catch((error) =>
          log.warn('mtgjson_price_history_continue_failed', { error: String(error) }),
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          mode: 'scan',
          results,
          missing,
          scanned: names.length,
          inserted: rows.length,
          nextOffset: offset + names.length,
        }),
        { status: 200, headers },
      );
    } catch (error) {
      log.error('mtgjson-price-history-sync error', error);
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers,
      });
    }
  }),
);
