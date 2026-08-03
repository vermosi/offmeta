import { createGunzip } from 'node:zlib';
import { Readable } from 'node:stream';

const CARD_NAME = 'Birds of Paradise';
const SET_CODE = 'RAV';

async function getCardUuid() {
  const set = await (await fetch(`https://mtgjson.com/api/v5/${SET_CODE}.json`)).json();
  const card = set.data.cards.find((item) => item.name === CARD_NAME);
  if (!card?.uuid) throw new Error(`Missing UUID for ${CARD_NAME}`);
  return card.uuid;
}

async function extractCardPrices(uuid) {
  const resp = await fetch('https://mtgjson.com/api/v5/AllPrices.json.gz');
  if (!resp.ok || !resp.body) throw new Error(`AllPrices fetch failed: ${resp.status}`);

  const gunzip = createGunzip();
  const stream = Readable.fromWeb(resp.body);
  let buffer = '';
  let captured = '';
  let capturing = false;
  let depth = 0;
  const key = `"${uuid}":{`;

  return await new Promise((resolve, reject) => {
    gunzip.on('data', (chunk) => {
      buffer += chunk.toString('utf8');

      if (!capturing) {
        const idx = buffer.indexOf(key);
        if (idx === -1) {
          buffer = buffer.slice(-20000);
          return;
        }

        buffer = buffer.slice(idx + key.length - 1);
        capturing = true;
        depth = 0;
        captured = '';
      }

      if (capturing) {
        for (let i = 0; i < buffer.length; i += 1) {
          const ch = buffer[i];
          if (ch === '{' || captured.length > 0) {
            captured += ch;
          }
          if (ch === '{') depth += 1;
          if (ch === '}') depth -= 1;
          if (depth === 0) {
            resolve(captured);
            stream.destroy();
            gunzip.destroy();
            return;
          }
        }
        buffer = '';
      }
    });

    gunzip.on('error', reject);
    stream.on('error', reject);
    stream.pipe(gunzip);
  });
}

function takeLastDays(map, days = 7) {
  return Object.entries(map ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-days)
    .map(([date, price]) => ({ date, price }));
}

const uuid = await getCardUuid();
const jsonText = await extractCardPrices(uuid);
const parsed = JSON.parse(jsonText);

const paper = parsed.paper ?? {};
const tcg = paper.tcgplayer?.retail?.normal ?? {};
const foil = paper.tcgplayer?.retail?.foil ?? {};
const cardmarket = paper.cardmarket?.retail?.normal ?? {};
const cardkingdom = paper.cardkingdom?.retail?.normal ?? {};

const market = takeLastDays(tcg, 7);
const foilSeries = takeLastDays(foil, 7);
const low = takeLastDays(cardmarket, 7);
const average = takeLastDays(cardkingdom, 7);

console.log(JSON.stringify({
  cardName: CARD_NAME,
  uuid,
  market,
  foil: foilSeries,
  low,
  average,
}, null, 2));
