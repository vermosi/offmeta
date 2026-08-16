import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

/**
 * Budget check for the JS actually downloaded on first paint.
 *
 * Summing every file in dist/assets is misleading: it counts 10 mutually
 * exclusive locale chunks and every lazily loaded route, so the number grows
 * with the app's surface area rather than with what a visitor pays for.
 * Instead we walk the static import graph from the HTML entry script and only
 * budget that closure, plus a cap on any single lazy chunk.
 */

const distDir = join(process.cwd(), 'dist');
const distAssetsDir = join(distDir, 'assets');
const indexHtmlPath = join(distDir, 'index.html');
const maxInitialKb = 600;
const maxLazyChunkKb = 300;

if (!existsSync(distAssetsDir) || !existsSync(indexHtmlPath)) {
  process.exit(0);
}

const gzipSize = (file) =>
  gzipSync(readFileSync(join(distAssetsDir, file))).length;

const html = readFileSync(indexHtmlPath, 'utf8');
const entries = [...html.matchAll(/<script[^>]+src="\/assets\/([^"]+\.js)"/g)].map(
  (match) => match[1]
);

if (entries.length === 0) {
  console.error('::error::No entry script found in dist/index.html');
  process.exit(1);
}

const staticImportPattern =
  /(?:^|[;\s}])import\s*(?:[^'"]*?from\s*)?["']\.\/([^"']+\.js)["']/g;

const initialChunks = new Set();
const queue = [...entries];

while (queue.length > 0) {
  const file = queue.pop();
  if (initialChunks.has(file)) continue;
  const filePath = join(distAssetsDir, file);
  if (!existsSync(filePath)) continue;
  initialChunks.add(file);

  const source = readFileSync(filePath, 'utf8');
  for (const match of source.matchAll(staticImportPattern)) {
    queue.push(match[1]);
  }
}

let initialBytes = 0;
for (const file of initialChunks) {
  initialBytes += gzipSize(file);
}
const initialKb = Math.floor(initialBytes / 1024);

const lazyChunks = readdirSync(distAssetsDir)
  .filter((file) => file.endsWith('.js') && !initialChunks.has(file))
  .map((file) => ({ file, kb: Math.floor(gzipSize(file) / 1024) }))
  .sort((a, b) => b.kb - a.kb);

console.log(
  `Initial JS: ${initialKb}KB gzipped across ${initialChunks.size} chunks (budget ${maxInitialKb}KB)`
);
if (lazyChunks.length > 0) {
  console.log(
    `Largest lazy chunk: ${lazyChunks[0].file} (${lazyChunks[0].kb}KB gzipped, budget ${maxLazyChunkKb}KB)`
  );
}

let failed = false;

if (initialKb > maxInitialKb) {
  console.error(
    `::error::Initial JS payload exceeds ${maxInitialKb}KB gzipped (${initialKb}KB)`
  );
  failed = true;
}

for (const chunk of lazyChunks.filter((c) => c.kb > maxLazyChunkKb)) {
  console.error(
    `::error::Lazy chunk ${chunk.file} exceeds ${maxLazyChunkKb}KB gzipped (${chunk.kb}KB)`
  );
  failed = true;
}

process.exit(failed ? 1 : 0);
