import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const distAssetsDir = join(process.cwd(), 'dist', 'assets');
const maxSizeKb = 1024;

if (!existsSync(distAssetsDir)) {
  process.exit(0);
}

const jsFiles = readdirSync(distAssetsDir)
  .filter((file) => file.endsWith('.js'))
  .map((file) => join(distAssetsDir, file));

let gzipTotal = 0;

for (const file of jsFiles) {
  const gzipped = execFileSync('gzip', ['-c', file], { encoding: 'buffer' });
  gzipTotal += gzipped.length;
}

const gzipKb = Math.floor(gzipTotal / 1024);

if (gzipKb > maxSizeKb) {
  console.error(`::error::JS bundle size exceeds ${maxSizeKb}KB gzipped (${gzipKb}KB)`);
  process.exit(1);
}
