#!/usr/bin/env node
/**
 * Fails the build when raw Tailwind palette colors (`text-white`, `bg-slate-800`,
 * `border-[#0f0f0f]`) leak into components. Colors must come from semantic
 * design tokens so theming stays consistent.
 *
 * Generated data modules (set / otag / art-tag / subtype vocabularies) are
 * skipped: they contain Scryfall tag slugs such as "black-white" or
 * "red-border" that are not Tailwind classes and would only produce noise.
 *
 * Usage: node scripts/check-design-tokens.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

const ROOT = process.cwd();
const SCAN_DIRS = ['src', 'supabase/functions'];

/** Directories never worth scanning. */
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git', 'coverage']);

/**
 * Generated or data-only files. These hold vocabulary slugs, not class names.
 */
const SKIP_FILE_PATTERNS = [
  /(^|\/)src\/data\//,
  /(^|\/)scripts\/data\//,
  /-vocabulary\.ts$/,
  /scryfall-tagger-tags\.txt$/,
  /\.test\.tsx?$/,
];

const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const UTILITY =
  'text|bg|border|from|via|to|ring|fill|stroke|shadow|decoration|outline|divide|accent|caret|placeholder';

const RULES = [
  {
    id: 'raw-tailwind-palette',
    pattern: new RegExp(`\\b(?:${UTILITY})-(?:${PALETTE})-\\d{2,3}\\b`, 'g'),
  },
  {
    id: 'raw-black-white',
    pattern: new RegExp(`\\b(?:${UTILITY})-(?:white|black)\\b(?!\\/)`, 'g'),
  },
  {
    id: 'raw-hex-color',
    pattern: new RegExp(`\\b(?:${UTILITY})-\\[#[0-9a-fA-F]{3,8}\\]`, 'g'),
  },
];

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(join(dir, entry.name));
    } else if (/\.(ts|tsx|css|html)$/i.test(entry.name)) {
      yield join(dir, entry.name);
    }
  }
}

function isSkipped(relPath) {
  return SKIP_FILE_PATTERNS.some((pattern) => pattern.test(relPath));
}

const offenders = [];
let scanned = 0;

for (const dir of SCAN_DIRS) {
  const absolute = resolve(ROOT, dir);
  try {
    statSync(absolute);
  } catch {
    continue;
  }
  for (const file of walk(absolute)) {
    const relPath = relative(ROOT, file);
    if (isSkipped(relPath)) continue;
    scanned += 1;
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      if (/eslint-disable|design-tokens-ignore/.test(line)) return;
      for (const rule of RULES) {
        rule.pattern.lastIndex = 0;
        const matches = line.match(rule.pattern);
        if (matches) {
          offenders.push(`${relPath}:${index + 1} [${rule.id}] ${matches.join(', ')}`);
        }
      }
    });
  }
}

if (offenders.length > 0) {
  console.error(
    `Raw color values found in ${offenders.length} place(s). Use semantic design tokens instead:`,
  );
  for (const offender of offenders) console.error(`- ${offender}`);
  process.exit(1);
}

console.log(`Design tokens clean (${scanned} files scanned).`);
