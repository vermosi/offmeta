/**
 * Loads `.env` / `.env.local` into `process.env` for build-time Node scripts.
 *
 * Vite reads `.env` itself, but plain Node scripts (prebuild sitemap
 * generation, postbuild card prerendering) do not. Without this, those scripts
 * saw no `VITE_SUPABASE_URL` and silently produced a stub sitemap and zero
 * prerendered card pages, which made every /cards/* URL look like a homepage
 * clone to crawlers.
 *
 * Existing `process.env` values always win (CI secrets override local files).
 */

import fs from 'node:fs';
import path from 'node:path';

const FILES = ['.env', '.env.local'];

function parseEnv(contents) {
  const out = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

export function loadEnv(cwd = process.cwd()) {
  const loaded = [];
  for (const file of FILES) {
    const full = path.join(cwd, file);
    if (!fs.existsSync(full)) continue;
    const parsed = parseEnv(fs.readFileSync(full, 'utf8'));
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
    loaded.push(file);
  }
  return loaded;
}

loadEnv();
