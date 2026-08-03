/**
 * mtgjson-price-history-sync - Daily MTGJSON price maintenance job.
 *
 * Uses the small daily feed (AllPricesToday.json.gz, ~5MB gzipped) and writes
 * only today's snapshot for cards we can resolve to an MTGJSON uuid.
 *
 * Historical catch-up lives in scripts/backfill-mtgjson-price-history.mjs,
 * which streams the full archive out of band. The full archive must never be
 * loaded here: it exceeds edge CPU/memory limits.
 *
 * The uuid map is resolved from card_printings when that table is populated,
 * and otherwise from existing MTGJSON rows in price_snapshots, so the job
 * never depends on card_printings having data.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, requireServiceOrPipelineKey } from '../_shared/auth.ts';
import { createLogger, withLogging } from '../_shared/logger.ts';

const log = createLogger('mtgjson-price-history-sync');
const MTGJSON_BASE_URL = 'https://mtgjson.com/api/v5';
const RECENT_WINDOW_DAYS = 14;
const UPSERT_CHUNK_SIZE = 500;

type MtgjsonPriceTree = Record<string, unknown>;
type SupabaseClient = ReturnType<typeof createClient>;

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

function getPath(obj: MtgjsonPriceTree, path: string): Record<string, number> | undefined {
  return path
    .split('.')
    .reduce(
      (acc: unknown, key) => (acc as Record<string, unknown> | undefined)?.[key],
      obj,
    ) as Record<string, number> | undefined;
}

/** Latest dated value in an MTGJSON date->price map. */
function latestValue(map: Record<string, number> | undefined): number | null {
  const entries = Object.entries(map ?? {});
  if (entries.length === 0) return null;
  entries.sort(([a], [b]) => a.localeCompare(b));
  const value = entries[entries.length - 1][1];
  return typeof value === 'number' ? value : null;
}

function buildTodayRow(
  current: MtgjsonPriceTree,
  cardName: string,
  uuid: string,
  recordedAt: string,
): PriceSnapshotRow | null {
  const low = latestValue(getPath(current, 'paper.cardmarket.retail.normal'));
  const average = latestValue(getPath(current, 'paper.cardkingdom.retail.normal'));
  const market = latestValue(getPath(current, 'paper.tcgplayer.retail.normal'));
  const foil = latestValue(getPath(current, 'paper.tcgplayer.retail.foil'));

  if (low === null && average === null && market === null && foil === null) return null;

  return {
    card_name: cardName,
    scryfall_id: uuid,
    source: 'mtgjson',
    price_usd: market,
    price_usd_foil: foil,
    price_low: low,
    price_average: average,
    price_market: market,
    price_foil: foil,
    recorded_at: recordedAt,
  };
}

/** name -> mtgjson uuid, preferring card_printings, falling back to price history. */
async function getTargetBatch(
  supabase: SupabaseClient,
  limit: number,
  offset: number,
): Promise<{ targets: Map<string, string>; scanned: number; source: string }> {
  const printings = await supabase
    .from('card_printings')
    .select('name, mtgjson_uuid')
    .not('mtgjson_uuid', 'is', null)
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (!printings.error && printings.data && printings.data.length > 0) {
    const targets = new Map<string, string>();
    for (const row of printings.data as Array<{ name: string; mtgjson_uuid: string }>) {
      if (!targets.has(row.name)) targets.set(row.name, row.mtgjson_uuid);
    }
    return { targets, scanned: printings.data.length, source: 'card_printings' };
  }

  const since = new Date(Date.now() - RECENT_WINDOW_DAYS * 86_400_000).toISOString();
  const history = await supabase
    .from('price_snapshots')
    .select('card_name, scryfall_id')
    .eq('source', 'mtgjson')
    .not('scryfall_id', 'is', null)
    .gte('recorded_at', since)
    .order('card_name', { ascending: true })
    .range(offset, offset + limit - 1);

  const targets = new Map<string, string>();
  if (!history.error && history.data) {
    for (const row of history.data as Array<{ card_name: string; scryfall_id: string }>) {
      if (!targets.has(row.card_name)) targets.set(row.card_name, row.scryfall_id);
    }
  }
  return {
    targets,
    scanned: history.data?.length ?? 0,
    source: 'price_snapshots',
  };
}

async function fetchTodayPrices(): Promise<Record<string, MtgjsonPriceTree>> {
  const resp = await fetch(`${MTGJSON_BASE_URL}/AllPricesToday.json.gz`);
  if (!resp.ok || !resp.body) throw new Error(`AllPricesToday failed: ${resp.status}`);
  const decompressed = resp.body.pipeThrough(new DecompressionStream('gzip'));
  const parsed = JSON.parse(await new Response(decompressed).text());
  return (parsed?.data ?? parsed) as Record<string, MtgjsonPriceTree>;
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
    const explicitNames: string[] = Array.isArray(body.cardNames)
      ? body.cardNames.filter((name: unknown): name is string => typeof name === 'string')
      : typeof body.cardName === 'string'
        ? [body.cardName.trim()]
        : [];
    const batchSize = Math.max(1, Math.min(Number(body.batchSize ?? 500) || 500, 1000));
    const offset = Math.max(0, Number(body.offset ?? 0) || 0);
    const followUp = body.continue !== false;

    // recorded_at is normalized to midnight UTC so reruns hit the unique key
    // (card_name, source, recorded_at) and upsert instead of duplicating.
    const recordedAt = `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;

    try {
      let targets: Map<string, string>;
      let scanned: number;
      let mapSource: string;

      if (explicitNames.length > 0) {
        const { targets: all, scanned: seen, source } = await getTargetBatch(
          supabase,
          1000,
          0,
        );
        targets = new Map(
          Array.from(all.entries()).filter(([name]) => explicitNames.includes(name)),
        );
        scanned = seen;
        mapSource = source;
      } else {
        const batch = await getTargetBatch(supabase, batchSize, offset);
        targets = batch.targets;
        scanned = batch.scanned;
        mapSource = batch.source;
      }

      if (targets.size === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            mode: 'daily',
            mapSource,
            scanned,
            inserted: 0,
            missing: [],
            nextOffset: offset + scanned,
            done: scanned === 0,
          }),
          { status: 200, headers },
        );
      }

      const prices = await fetchTodayPrices();

      const rows: PriceSnapshotRow[] = [];
      const missing: string[] = [];
      for (const [cardName, uuid] of targets.entries()) {
        const current = prices[uuid];
        if (!current) {
          missing.push(cardName);
          continue;
        }
        const row = buildTodayRow(current, cardName, uuid, recordedAt);
        if (row) rows.push(row);
        else missing.push(cardName);
      }

      for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
        const chunk = rows.slice(i, i + UPSERT_CHUNK_SIZE);
        const { error } = await supabase
          .from('price_snapshots')
          .upsert(chunk, { onConflict: 'card_name,source,recorded_at' });
        if (error) throw error;
      }

      const hasMore = explicitNames.length === 0 && scanned === batchSize;
      if (hasMore && followUp) {
        fetch(`${supabaseUrl}/functions/v1/mtgjson-price-history-sync`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ batchSize, offset: offset + scanned }),
        }).catch((error) =>
          log.warn('mtgjson_price_history_continue_failed', { error: String(error) }),
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          mode: 'daily',
          mapSource,
          recordedAt,
          scanned,
          inserted: rows.length,
          missing: missing.slice(0, 25),
          missingCount: missing.length,
          nextOffset: offset + scanned,
          done: !hasMore,
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
