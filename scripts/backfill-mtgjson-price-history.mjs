import { createGunzip } from 'node:zlib';
import { Readable } from 'node:stream';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const MTGJSON_BASE_URL = 'https://mtgjson.com/api/v5';
const PROGRESS_DIR = path.resolve('.cache');
const PROGRESS_FILE = path.join(PROGRESS_DIR, 'mtgjson-backfill-progress.json');
const SETS_PER_RUN = Math.max(1, Number(process.env.BACKFILL_SETS_PER_RUN ?? 1));
const DAYS = Math.max(1, Number(process.env.BACKFILL_DAYS ?? 90));

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function sliceLastDays(map, days) {
  return Object.entries(map ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-days)
    .map(([date, price]) => ({ date, price }));
}

function getPathValue(obj, pathName) {
  return pathName.split('.').reduce((acc, key) => acc?.[key], obj) ?? {};
}

function buildRows(current, cardName, uuid, days) {
  const low = sliceLastDays(getPathValue(current, 'paper.cardmarket.retail.normal'), days);
  const average = sliceLastDays(getPathValue(current, 'paper.cardkingdom.retail.normal'), days);
  const market = sliceLastDays(getPathValue(current, 'paper.tcgplayer.retail.normal'), days);
  const foil = sliceLastDays(getPathValue(current, 'paper.tcgplayer.retail.foil'), days);

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

function mapPrintingRow(set, card) {
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

async function readProgress() {
  try {
    return JSON.parse(await readFile(PROGRESS_FILE, 'utf8'));
  } catch {
    return { setIndex: 0 };
  }
}

async function writeProgress(progress) {
  await mkdir(PROGRESS_DIR, { recursive: true });
  await writeFile(PROGRESS_FILE, `${JSON.stringify(progress, null, 2)}\n`);
}

async function getSetList() {
  const resp = await fetch(`${MTGJSON_BASE_URL}/SetList.json`);
  if (!resp.ok) throw new Error(`SetList failed: ${resp.status}`);
  const json = await resp.json();
  return (json.data ?? []).filter((set) => set?.code);
}

async function extractUuidObjects(stream, uuids) {
  const found = new Map();
  const pending = new Set(uuids);
  const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  let capturingUuid = null;
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
        let bestUuid = null;
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

    if (capturingUuid === null && buffer.length > maxKeyLen * 4) {
      buffer = buffer.slice(-maxKeyLen * 2);
    }
  }

  reader.cancel().catch(() => undefined);
  return found;
}

const supabaseUrl = requireEnv('SUPABASE_URL');
const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, serviceRoleKey);

const progress = await readProgress();
const setList = await getSetList();
const start = Math.max(0, Number(progress.setIndex ?? 0) || 0);
const sets = setList.slice(start, start + SETS_PER_RUN);

if (sets.length === 0) {
  console.log(JSON.stringify({ done: true, setIndex: start }, null, 2));
  process.exit(0);
}

let totalUpsertedPrintings = 0;
let totalInsertedPrices = 0;

for (const set of sets) {
  const setResp = await fetch(`${MTGJSON_BASE_URL}/${set.code}.json`);
  if (!setResp.ok) {
    console.log(JSON.stringify({ set: set.code, skipped: true, status: setResp.status }, null, 2));
    continue;
  }

  const setData = await setResp.json();
  const cards = setData.data?.cards ?? [];
  const printings = cards.map((card) => mapPrintingRow(setData, card));

  for (let i = 0; i < printings.length; i += 500) {
    const chunk = printings.slice(i, i + 500);
    const { error } = await supabase.from('card_printings').upsert(chunk, { onConflict: 'id' });
    if (error) throw error;
    totalUpsertedPrintings += chunk.length;
  }

  const pricesResp = await fetch(`${MTGJSON_BASE_URL}/AllPrices.json.gz`);
  if (!pricesResp.ok || !pricesResp.body) {
    throw new Error(`AllPrices failed: ${pricesResp.status}`);
  }

  const gunzip = createGunzip();
  const stream = Readable.fromWeb(pricesResp.body);
  stream.pipe(gunzip);

  const extracted = await extractUuidObjects(gunzip, cards.map((card) => card.uuid).filter(Boolean));
  const rows = [];

  for (const card of cards) {
    const raw = extracted.get(card.uuid);
    if (!raw) continue;
    const current = JSON.parse(raw);
    rows.push(...buildRows(current, card.name, card.uuid, DAYS));
  }

  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await supabase
      .from('price_snapshots')
      .upsert(chunk, { onConflict: 'card_name,source,recorded_at' });
    if (error) throw error;
    totalInsertedPrices += chunk.length;
  }

  console.log(
    JSON.stringify(
      { set: set.code, printings: printings.length, priceRows: rows.length },
      null,
      2,
    ),
  );
}

await writeProgress({ setIndex: start + sets.length });
console.log(
  JSON.stringify(
    {
      setIndex: start,
      processedSets: sets.length,
      upsertedPrintings: totalUpsertedPrintings,
      insertedPrices: totalInsertedPrices,
      nextSetIndex: start + sets.length,
    },
    null,
    2,
  ),
);
