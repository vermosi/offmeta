import { readdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const CURRENT_FILE = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(CURRENT_FILE), '../../..');
const SRC_ROOT = resolve(REPO_ROOT, 'src');
const THIS_FILE = relative(REPO_ROOT, CURRENT_FILE);

const COLOR_FAMILIES = [
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
  'black',
  'white',
].join('|');

const RAW_COLOR_CLASS = new RegExp(
  `\\b(?:bg|text|border|ring|from|to|via)-(?:${COLOR_FAMILIES})(?:-\\d{2,3})?(?:/\\d{1,3})?\\b`,
  'g',
);

const SCANNED_EXTENSIONS = new Set(['.ts', '.tsx', '.css']);
const SKIPPED_DIRS = new Set(['node_modules', 'dist', 'coverage', '.git']);
const APPROVED_MTG_MARKER = 'APPROVED_MTG_COLOR_SYMBOL_MAPPING';

function extensionOf(path: string) {
  const dotIndex = path.lastIndexOf('.');
  return dotIndex >= 0 ? path.slice(dotIndex) : '';
}

function collectFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith('.') || SKIPPED_DIRS.has(entry.name)) return [];

    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(path);
    if (!entry.isFile() || !SCANNED_EXTENSIONS.has(extensionOf(entry.name)))
      return [];

    return [path];
  });
}

describe('Tailwind semantic color tokens', () => {
  it('rejects raw Tailwind palette color utility classes', { timeout: 15000 }, () => {
    const violations = collectFiles(SRC_ROOT).flatMap((file) => {
      const repoPath = relative(REPO_ROOT, file);
      if (repoPath === THIS_FILE) return [];

      return readFileSync(file, 'utf8')
        .split('\n')
        .flatMap((line, index) => {
          if (line.includes(APPROVED_MTG_MARKER)) return [];

          return [...line.matchAll(RAW_COLOR_CLASS)].map(
            (match) => `${repoPath}:${index + 1} uses ${match[0]}`,
          );
        });
    });

    expect(violations).toEqual([]);
  });
});
