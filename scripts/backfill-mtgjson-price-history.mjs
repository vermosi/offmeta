/**
 * One-time historical MTGJSON price backfill (local sandbox only).
 *
 * The full archive (AllPrices.json.gz, ~150MB gzipped / ~2GB raw) can never run
 * in the edge runtime. This script streams it here instead. The daily top-up
 * lives in supabase/functions/mtgjson-price-history-sync.
 *
 * Two resumable phases, checkpointed to .cache/mtgjson-backfill-progress.json:
 *   1. sets   - page through MTGJSON set files, upsert card_printings, and
 *               build the uuid -> card name map.
 *   2. prices - single streaming pass over the archive, upserting
 *               price_snapshots in chunks.
 *
 * Restarting after an interruption resumes at the last committed checkpoint.
 * All writes upsert on the existing unique keys, so reruns never duplicate.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run backfill:mtgjson
 *
 * Env knobs:
 *   BACKFILL_DAYS            history window per card (default 90)
 *   BACKFILL_SETS_PER_RUN    sets per invocation in phase 1 (default 50)
 *   BACKFILL_CHUNK_SIZE      rows per upsert (default 500)
 *   BACKFILL_PHASE           force 'sets' or 'prices'
 *   BACKFILL_RESET           '1' to discard the checkpoint and start over
 */

import { createGunzip } from 'node:zlib';
import { Readable } from 'node:stream';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const MTGJSON_BASE_URL = 'https://mtgjson.com/api/v5';
const CACHE_DIR = path.resolve('.cache');
const PROGRESS_FILE = path.join(CACHE_DIR, 'mtgjson-backfill-progress.json');
const UUID_MAP_FILE = path.join(CACHE_DIR, 'mtgjson-uuid-names.json');
const ARCHIVE_FILE = path.join(CACHE_DIR, 'AllPrices.json.gz');

const DAYS = Math.max(1, Number(process.env.BACKFILL_DAYS ?? 90));
const SETS_PER_RUN = Math.max(1, Number(process.env.BACKFILL_SETS_PER_RUN ?? 50));
const CHUNK_SIZE = Math.max(50, Number(process.env.BACKFILL_CHUNK_SIZE ?? 500));

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function log(payload) {
  console.log(JSON.stringify(payload));
}

// ---------------------------------------------------------------- checkpoint

const EMPTY_PROGRESS = {
  phase: 'sets',
  setIndex: 0,
  processedUuids: 0,
  lastUuid: null,
  insertedPrices: 0,
  upsertedPrintings: 0,
};

async function readProgress() {
  if (process.env.BACKFILL_RESET === '1') return { ...EMPTY_PROGRESS };
  try {
    return { ...EMPTY_PROGRESS, ...JSON.parse(await readFile(PROGRESS_FILE, 'utf8')) };
  } catch {
    return { ...EMPTY_PROGRESS };
  }
}

/** Atomic write so an interrupt can never leave a half-written checkpoint. */
async function writeProgress(progress) {
  await mkdir(CACHE_DIR, { recursive: true });
  const tmp = `${PROGRESS_FILE}.tmp`;
  await writeFile(tmp, `${JSON.stringify(progress, null, 2)}\n`);
  await rename(tmp, PROGRESS_FILE);
}

async function readUuidMap() {
  try {
    return JSON.parse(await readFile(UUID_MAP_FILE, 'utf8'));
  } catch {
    return {};
  }
}

async function writeUuidMap(map) {
  await mkdir(CACHE_DIR, { recursive: true });
  const tmp = `${UUID_MAP_FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(map));
  await rename(tmp, UUID_MAP_FILE);
}

// ------------------------------------------------------------------ mapping

function sliceLastDays(map, days) {
  return Object.entries(map ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-days);
}

function getPathValue(obj, pathName) {
  return pathName.split('.').reduce((acc, key) => acc?.[key], obj) ?? {};
}

/** Merge every provider series into one row per date. */
function buildRows(current, cardName, uuid, days) {
  const series = {
    low: Object.fromEntries(sliceLastDays(getPathValue(current, 'paper.cardmarket.retail.normal'), days)),
    average: Object.fromEntries(sliceLastDays(getPathValue(current, 'paper.cardkingdom.retail.normal'), days)),
    market: Object.fromEntries(sliceLastDays(getPathValue(current, 'paper.tcgplayer.retail.normal'), days)),
    foil: Object.fromEntries(sliceLastDays(getPathValue(current, 'paper.tcgplayer.retail.foil'), days)),
  };

  const dates = new Set([
    ...Object.keys(series.low),
    ...Object.keys(series.average),
    ...Object.keys(series.market),
    ...Object.keys(series.foil),
  ]);

  return Array.from(dates)
    .sort()
    .slice(-days)
    .map((date) => {
      const low = series.low[date] ?? null;
      const average = series.average[date] ?? null;
      const market = series.market[date] ?? null;
      const foil = series.foil[date] ?? null;
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
        recorded_at: `${date}T00:00:00.000Z`,
      };
    })
    .filter(Boolean);
}

function mapPrintingRow(setData, card) {
  const oracleId =
    card.identifiers?.scryfallOracleId ??
    card.identifiers?.mtgjsonV4Id ??
    card.identifiers?.scryfallId ??
    card.uuid;

  return {
    id: card.uuid,
    scryfall_id: card.identifiers?.scryfallId ?? null,
    mtgjson_uuid: card.uuid,
    oracle_id: oracleId,
    name: card.name,
    set: setData.data?.code ?? null,
    set_name: setData.data?.name ?? null,
    collector_number: card.number ?? card.collectorNumber ?? null,
    rarity: card.rarity ?? null,
    artist: card.artist ?? null,
    prices: null,
    image_url: null,
    purchase_uris: card.purchaseUrls ? { ...card.purchaseUrls } : null,
    identifiers: card.identifiers ? { ...card.identifiers } : null,
    related_cards: card.relatedCards ? { ...card.relatedCards } : null,
    released_at: setData.data?.releaseDate ?? null,
    lang: card.language === 'English' ? 'en' : (card.language ?? 'en'),
    updated_at: new Date().toISOString(),
  };
}

// ------------------------------------------------------------------- writing

/**
 * Two write backends: the REST client when a service-role key is available,
 * and a direct Postgres connection otherwise (the sandbox case).
 */
function createRestWriter(url, key) {
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  return {
    async upsert(table, chunk, onConflict) {
      const { error } = await supabase.from(table).upsert(chunk, { onConflict });
      if (error) throw new Error(`${table} upsert failed: ${error.message}`);
    },
    async close() {},
  };
}

async function createPgWriter(connectionString) {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  return {
    async upsert(table, chunk, onConflict) {
      const columns = Object.keys(chunk[0]);
      const conflictCols = onConflict.split(',').map((c) => c.trim());
      const updates = columns
        .filter((c) => !conflictCols.includes(c))
        .map((c) => `"${c}" = excluded."${c}"`);

      const values = [];
      const tuples = chunk.map((row) => {
        const placeholders = columns.map((col) => {
          const value = row[col];
          values.push(
            value !== null && typeof value === 'object' ? JSON.stringify(value) : value ?? null,
          );
          return `$${values.length}`;
        });
        return `(${placeholders.join(',')})`;
      });

      const sql =
        `INSERT INTO public."${table}" (${columns.map((c) => `"${c}"`).join(',')}) ` +
        `VALUES ${tuples.join(',')} ` +
        `ON CONFLICT (${conflictCols.map((c) => `"${c}"`).join(',')}) ` +
        (updates.length > 0 ? `DO UPDATE SET ${updates.join(',')}` : 'DO NOTHING');

      await client.query(sql, values);
    },
    async close() {
      await client.end();
    },
  };
}

async function upsertChunks(writer, table, rows, onConflict) {
  let written = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    if (chunk.length === 0) continue;
    await writer.upsert(table, chunk, onConflict);
    written += chunk.length;
  }
  return written;
}

// ------------------------------------------------------------------- phase 1

async function getSetList() {
  const resp = await fetch(`${MTGJSON_BASE_URL}/SetList.json`);
  if (!resp.ok) throw new Error(`SetList failed: ${resp.status}`);
  const json = await resp.json();
  return (json.data ?? []).filter((set) => set?.code).sort((a, b) => a.code.localeCompare(b.code));
}

async function runSetsPhase(supabase, progress) {
  const setList = await getSetList();
  const uuidNames = await readUuidMap();
  let index = Math.max(0, Number(progress.setIndex) || 0);
  const end = Math.min(setList.length, index + SETS_PER_RUN);

  for (; index < end; index += 1) {
    const set = setList[index];
    const resp = await fetch(`${MTGJSON_BASE_URL}/${set.code}.json`);
    if (!resp.ok) {
      log({ phase: 'sets', set: set.code, skipped: true, status: resp.status });
      continue;
    }

    const setData = await resp.json();
    const cards = setData.data?.cards ?? [];
    const printings = [];
    for (const card of cards) {
      if (!card?.uuid || !card?.name) continue;
      uuidNames[card.uuid] = card.name;
      printings.push(mapPrintingRow(setData, card));
    }

    const written = await upsertChunks(supabase, 'card_printings', printings, 'id');
    progress.upsertedPrintings += written;

    // Commit after every set so an interrupt costs at most one set.
    await writeUuidMap(uuidNames);
    await writeProgress({ ...progress, setIndex: index + 1 });
    log({ phase: 'sets', set: set.code, printings: written, setIndex: index + 1 });
  }

  const done = index >= setList.length;
  await writeProgress({ ...progress, setIndex: index, phase: done ? 'prices' : 'sets' });
  return { done, setIndex: index, totalSets: setList.length };
}

// ------------------------------------------------------------------- phase 2

async function ensureArchive() {
  try {
    const info = await stat(ARCHIVE_FILE);
    if (info.size > 1_000_000) return ARCHIVE_FILE;
  } catch {
    // fall through to download
  }
  await mkdir(CACHE_DIR, { recursive: true });
  const resp = await fetch(`${MTGJSON_BASE_URL}/AllPrices.json.gz`);
  if (!resp.ok || !resp.body) throw new Error(`AllPrices failed: ${resp.status}`);
  const tmp = `${ARCHIVE_FILE}.tmp`;
  await pipeline(Readable.fromWeb(resp.body), createWriteStream(tmp));
  await rename(tmp, ARCHIVE_FILE);
  return ARCHIVE_FILE;
}

/**
 * Yields [uuid, parsedValue] for each top-level entry of the archive's `data`
 * object without materializing the whole ~2GB document.
 */
async function* streamPriceEntries(stream) {
  let depth = 0;
  let inData = false;
  let pendingKey = null;
  let lastString = '';
  let strBuf = null; // accumulates the current string token across chunks
  let capture = null;
  let captureDepth = 0;
  let inString = false;
  let escaped = false;

  for await (const chunk of stream) {
    for (let i = 0; i < chunk.length; i += 1) {
      const ch = chunk[i];

      if (capture !== null) {
        capture += ch;
        if (inString) {
          if (escaped) escaped = false;
          else if (ch === '\\') escaped = true;
          else if (ch === '"') inString = false;
        } else if (ch === '"') inString = true;
        else if (ch === '{' || ch === '[') captureDepth += 1;
        else if (ch === '}' || ch === ']') {
          captureDepth -= 1;
          if (captureDepth === 0) {
            const uuid = pendingKey;
            const raw = capture;
            capture = null;
            pendingKey = null;
            yield [uuid, JSON.parse(raw)];
          }
        }
        continue;
      }

      if (inString) {
        if (escaped) {
          strBuf += ch;
          escaped = false;
        } else if (ch === '\\') {
          strBuf += ch;
          escaped = true;
        } else if (ch === '"') {
          inString = false;
          lastString = JSON.parse(`"${strBuf}"`);
          strBuf = null;
        } else {
          strBuf += ch;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        strBuf = '';
        continue;
      }

      if (ch === ':') {
        // The key that just closed labels the value we are about to read.
        if (depth === 1) inData = lastString === 'data';
        else if (depth === 2 && inData) pendingKey = lastString;
        continue;
      }

      if (ch === '{' || ch === '[') {
        if (pendingKey !== null && depth === 2 && inData) {
          capture = ch;
          captureDepth = 1;
          continue;
        }
        depth += 1;
        continue;
      }

      if (ch === '}' || ch === ']') {
        depth -= 1;
        if (depth <= 1) inData = false;
      }
    }
  }
}


async function runPricesPhase(supabase, progress) {
  const uuidNames = await readUuidMap();
  if (Object.keys(uuidNames).length === 0) {
    throw new Error('uuid map is empty - run the sets phase first');
  }

  const archive = await ensureArchive();
  const gunzip = createGunzip();
  createReadStream(archive).pipe(gunzip);
  gunzip.setEncoding('utf8');

  // Resume: skip everything already committed. Stream order is stable.
  let skipRemaining = Math.max(0, Number(progress.processedUuids) || 0);
  let processed = skipRemaining;
  let pending = [];
  let inserted = Number(progress.insertedPrices) || 0;
  let lastUuid = progress.lastUuid ?? null;

  const flush = async () => {
    if (pending.length === 0) return;
    inserted += await upsertChunks(
      supabase,
      'price_snapshots',
      pending,
      'card_name,source,recorded_at',
    );
    pending = [];
    await writeProgress({
      ...progress,
      phase: 'prices',
      processedUuids: processed,
      lastUuid,
      insertedPrices: inserted,
    });
    log({ phase: 'prices', processedUuids: processed, insertedPrices: inserted });
  };

  for await (const [uuid, value] of streamPriceEntries(gunzip)) {
    if (skipRemaining > 0) {
      skipRemaining -= 1;
      continue;
    }

    processed += 1;
    lastUuid = uuid;

    const cardName = uuidNames[uuid];
    if (!cardName) continue;

    pending.push(...buildRows(value, cardName, uuid, DAYS));
    if (pending.length >= CHUNK_SIZE * 4) await flush();
  }

  await flush();
  await writeProgress({
    ...progress,
    phase: 'done',
    processedUuids: processed,
    lastUuid,
    insertedPrices: inserted,
  });

  return { processed, inserted };
}

// ---------------------------------------------------------------------- main

const writer = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createRestWriter(requireEnv('SUPABASE_URL'), process.env.SUPABASE_SERVICE_ROLE_KEY)
  : await createPgWriter(requireEnv('SUPABASE_DB_URL'));

try {
  const progress = await readProgress();
  const phase = process.env.BACKFILL_PHASE ?? progress.phase;

  if (phase === 'done') {
    log({ done: true, message: 'Backfill complete. Set BACKFILL_RESET=1 to start over.' });
  } else if (phase === 'sets') {
    const result = await runSetsPhase(writer, progress);
    log({
      phase: 'sets',
      ...result,
      nextPhase: result.done ? 'prices' : 'sets',
      message: result.done
        ? 'Set catalog complete. Rerun to stream price history.'
        : 'Rerun to continue paging sets.',
    });
  } else {
    const result = await runPricesPhase(writer, progress);
    log({ phase: 'prices', ...result, done: true });
  }
} finally {
  await writer.close();
}
