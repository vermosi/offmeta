import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd(), 'src');
const COPY_FILE = resolve(process.cwd(), 'src/lib/i18n/copy.ts');

const TARGET_STRINGS = [
  'Search Magic cards without learning',
  'Describe the card, effect, price, color, format, or interaction you need.',
  'Plain English in, exact query out',
  'What OffMeta builds from your words',
  'Interpreting your request and fetching cards',
];

function* walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (/\.(ts|tsx)$/i.test(entry.name)) {
      yield full;
    }
  }
}

const offenders = [];
for (const file of walk(ROOT)) {
  if (file === COPY_FILE) continue;
  const text = readFileSync(file, 'utf8');
  for (const target of TARGET_STRINGS) {
    if (text.includes(target)) {
      offenders.push(`${file}: ${target}`);
    }
  }
}

if (offenders.length > 0) {
  console.error('MTG copy duplicated outside src/lib/i18n/copy.ts:');
  for (const offender of offenders) console.error(`- ${offender}`);
  process.exit(1);
}

console.log('MTG copy centralized.');
