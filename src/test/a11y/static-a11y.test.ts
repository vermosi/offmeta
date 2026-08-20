/**
 * Static accessibility regressions guard.
 *
 * Runtime axe checks only cover components we explicitly render in tests, so
 * these source-level assertions catch the two mistakes that keep recurring on
 * new pages: a skip link with no `#main-content` target, and icon-only buttons
 * shipped without an accessible name.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../..');

function read(file: string): string {
  return readFileSync(path.join(ROOT, file), 'utf8');
}

const pageFiles = globSync('src/pages/**/*.tsx', { cwd: ROOT }).filter(
  (f) => !f.includes('__tests__') && !f.endsWith('.test.tsx'),
);

describe('skip-link targets', () => {
  it('finds page files to check', () => {
    expect(pageFiles.length).toBeGreaterThan(10);
  });

  it.each(pageFiles)('%s renders a #main-content landmark when it uses SkipLinks', (file) => {
    const src = read(file);
    if (!src.includes('<SkipLinks')) return;
    expect(
      src.includes('id="main-content"'),
      `${file} renders <SkipLinks /> but has no element with id="main-content"`,
    ).toBe(true);
  });

  it.each(pageFiles)('%s gives its <main> the skip-link id', (file) => {
    const src = read(file);
    const mainTags = src.match(/<main\b[^>]*>/g) ?? [];
    if (mainTags.length === 0) return;
    expect(
      mainTags.some((tag) => tag.includes('id="main-content"')),
      `${file} has a <main> element without id="main-content"`,
    ).toBe(true);
  });
});

const componentFiles = globSync('src/{components,pages}/**/*.tsx', {
  cwd: ROOT,
}).filter((f) => !f.includes('__tests__') && !f.endsWith('.test.tsx'));

/** Matches a single JSX opening tag, including multi-line attribute lists. */
function openingTags(src: string, tagName: string): string[] {
  const re = new RegExp(`<${tagName}\\b[^>]*?>`, 'gs');
  return src.match(re) ?? [];
}

describe('icon-only controls have accessible names', () => {
  it.each(componentFiles)('%s labels every size="icon" Button', (file) => {
    const src = read(file);
    const offenders = openingTags(src, 'Button').filter((tag) => {
      if (!/size=["']icon["']/.test(tag)) return false;
      return !/aria-label|aria-labelledby|title=/.test(tag);
    });
    expect(
      offenders,
      `${file} has icon-only Button(s) without an accessible name:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });
});
