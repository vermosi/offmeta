/**
 * mtgjson-price-history-sync - Backfills price history from MTGJSON.
 *
 * Default: scan local card_printings for cards missing MTGJSON history.
 * Fallback: targeted backfill for explicit card names.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, requireServiceOrPipelineKey } from '../_shared/auth.ts';
import { createLogger, withLogging } from '../_shared/logger.ts';

const log = createLogger('mtgjson-price-history-sync');
const MTGJSON_BASE_URL = 'https://mtgjson.com/api/v5';

type MtgjsonPriceTree = Record<string, unknown>;
type SetResponse = { data?: { cards?: Array<{ uuid?: string; name?: string }> } };

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
  return path.split('.').reduce((acc: unknown, key) => (acc as Record<string, unknown> | undefined)?.[key], obj) as Record<string, number> | undefined;
}

/**
 * Streams the (huge) AllPrices payload and extracts only the JSON objects for
 * the requested uuids. Buffering the whole file blows the edge memory limit.
 */
async function streamExtractUuidObjects(
  stream: ReadableStream<Uint8Array>,
  uuids: string[],
): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  const pending = new Set(uuids);
  const reader = stream.pipeThrough(new TextDecoderStream()).getReader();

  let buffer = '';
  let capturingUuid: string | null = null;
  let captured = '';
  let depth = 0;

  const maxKeyLen = uuids.reduce((max, uuid) => Math.max(max, uuid.length + 4), 8);

  while (pending.size > 0) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;

    let progressed = true;
    while (progressed) {
      progressed = false;

      if (capturingUuid === null) {
        let bestIndex = -1;
        let bestUuid: string | null = null;
        for (const uuid of pending) {
          const idx = buffer.indexOf(`"${uuid}":{`);
          if (idx !== -1 && (bestIndex === -1 || idx < bestIndex)) {
            bestIndex = idx;
            bestUuid = uuid;
          }
        }
        if (bestUuid === null) break;
        buffer = buffer.slice(bestIndex + bestUuid.length + 3);
        capturingUuid = bestUuid;
        captured = '{';
        depth = 1;
        progressed = true;
      }

      if (capturingUuid !== null) {
        let closed = false;
        for (let i = 0; i < buffer.length; i += 1) {
          const ch = buffer[i];
          captured += ch;
          if (ch === '{') depth += 1;
          else if (ch === '}') depth -= 1;
          if (depth === 0) {
            found.set(capturingUuid, captured);
            pending.delete(capturingUuid);
            buffer = buffer.slice(i + 1);
            capturingUuid = null;
            captured = '';
            closed = true;
            progressed = true;
            break;
          }
        }
        if (!closed) buffer = '';
      }
    }

    // Keep only enough tail to match a key split across chunk boundaries.
    if (capturingUuid === null && buffer.length > maxKeyLen * 4) {
      buffer = buffer.slice(-maxKeyLen * 2);
    }
  }

  reader.cancel().catch(() => undefined);
  return found;
}


async function getCardUuid(cardName: string): Promise<string | null> {
  const setResp = await fetch(`${MTGJSON_BASE_URL}/RAV.json`);
  if (!setResp.ok) return null;
  const set = (await setResp.json()) as SetResponse;
  return set.data?.cards?.find((item) => item.name === cardName)?.uuid ?? null;
}

async function getCardUuids(cardNames: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const uniq = Array.from(new Set(cardNames.map((name) => name.trim()).filter(Boolean)));
  for (const name of uniq) {
    const uuid = await getCardUuid(name);
    if (uuid) result.set(name, uuid);
  }
  return result;
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
      .select('card_name, source')
      .in('card_name', batch)
      .eq('source', 'mtgjson')
      .limit(batch.length);

    if (error || !data) continue;
    for (const row of data) existing.add(row.card_name);
  }
  return existing;
}

serve(withLogging('mtgjson-price-history-sync', async (req: Request): Promise<Response> => {
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
    let uuidMap: Map<string, string>;
    let missing: string[] = [];
    let scanned = 0;

    if (scan) {
      const batch = await getScanBatch(supabase, batchSize, offset);
      const unique = new Map<string, string>();
      for (const row of batch) {
        if (!unique.has(row.name) && row.mtgjson_uuid) unique.set(row.name, row.mtgjson_uuid);
      }

      const names = Array.from(unique.keys());
      const existing = await getExistingHistoryNames(supabase, names);
      uuidMap = new Map(
        Array.from(unique.entries()).filter(([name]) => !existing.has(name)),
      );
      missing = names.filter((name) => existing.has(name));
      scanned = names.length;
    } else {
      uuidMap = await getCardUuids(cardNames);
      missing = cardNames.filter((name) => !uuidMap.has(name));
      if (uuidMap.size === 0) {
        return new Response(JSON.stringify({ error: 'Card not found', missing }), { status: 404, headers });
      }
    }

    const pricesResp = await fetch(`${MTGJSON_BASE_URL}/AllPrices.json.gz`);
    if (!pricesResp.ok || !pricesResp.body) {
      return new Response(JSON.stringify({ error: 'Failed to load MTGJSON prices' }), { status: 502, headers });
    }

    const decompressed = pricesResp.body.pipeThrough(new DecompressionStream('gzip'));
    const text = await new Response(decompressed).text();

    const rows: PriceSnapshotRow[] = [];
    const results: Array<{ cardName: string; uuid: string; inserted: number }> = [];

    for (const [cardName, uuid] of uuidMap.entries()) {
      const raw = extractUuidObject(text, uuid);
      if (!raw) {
        missing.push(cardName);
        continue;
      }

      const history = JSON.parse(raw) as MtgjsonPriceTree;
      const low = sliceLastDays(getPath(history, 'paper.cardmarket.retail.normal'), days);
      const average = sliceLastDays(getPath(history, 'paper.cardkingdom.retail.normal'), days);
      const market = sliceLastDays(getPath(history, 'paper.tcgplayer.retail.normal'), days);
      const foil = sliceLastDays(getPath(history, 'paper.tcgplayer.retail.foil'), days);

      const itemRows = market.map((entry, index) => ({
        card_name: cardName,
        scryfall_id: null,
        source: 'mtgjson',
        price_usd: market[index]?.price ?? null,
        price_usd_foil: foil[index]?.price ?? null,
        price_low: low[index]?.price ?? null,
        price_average: average[index]?.price ?? null,
        price_market: market[index]?.price ?? null,
        price_foil: foil[index]?.price ?? null,
        recorded_at: `${entry.date}T00:00:00.000Z`,
      }));

      rows.push(...itemRows);
      results.push({ cardName, uuid, inserted: itemRows.length });
    }

    if (rows.length > 0) {
      const { error } = await supabase
        .from('price_snapshots')
        .upsert(rows, { onConflict: 'card_name,source,recorded_at' });
      if (error) throw error;
    }

    if (scan && scanned === batchSize) {
      fetch(`${supabaseUrl}/functions/v1/mtgjson-price-history-sync`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scan: true, days, batchSize, offset: offset + scanned }),
      }).catch((error) => log.warn('mtgjson_price_history_continue_failed', { error: String(error) }));
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode: scan ? 'scan' : 'targeted',
        results,
        missing,
        scanned,
        inserted: rows.length,
        nextOffset: scan ? offset + scanned : null,
      }),
      { status: 200, headers },
    );
  } catch (error) {
    log.error('mtgjson-price-history-sync error', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers });
  }
}));
