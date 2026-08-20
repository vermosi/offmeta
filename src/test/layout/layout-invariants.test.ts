/**
 * Layout invariants that protect the mobile viewport work.
 *
 * The dvh migration only holds if new code keeps following the same rules:
 * dynamic viewport units always ship with a static fallback, sticky headers
 * stay above content, and scroll areas never rely on `h-screen`.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, globSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../..');

const sourceFiles = globSync('src/{components,pages,layouts}/**/*.tsx', {
  cwd: ROOT,
}).filter((f) => !f.includes('__tests__') && !f.endsWith('.test.tsx'));

function read(file: string): string {
  return readFileSync(path.join(ROOT, file), 'utf8');
}

/** All className string literals in a file. */
function classNames(src: string): string[] {
  const matches = src.match(/className=(?:"[^"]*"|'[^']*'|\{`[^`]*`\})/gs) ?? [];
  return matches.map((m) => m.replace(/^className=/, ''));
}

describe('viewport height fallbacks', () => {
  it.each(sourceFiles)('%s pairs dvh utilities with a fallback', (file) => {
    const offenders = classNames(read(file)).filter((cls) => {
      const hasDvh = /\b(min-h-dvh|h-dvh)\b/.test(cls);
      if (!hasDvh) return false;
      const hasFallback = /\b(min-h-screen|h-screen)\b/.test(cls);
      return !hasFallback;
    });
    expect(
      offenders,
      `${file}: dvh utilities must ship with the matching *-screen fallback so browsers without dvh keep working:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });

  it.each(sourceFiles)('%s never uses a bare *-screen height', (file) => {
    const offenders = classNames(read(file)).filter((cls) => {
      const hasScreen = /\b(min-h-screen|h-screen)\b/.test(cls);
      if (!hasScreen) return false;
      return !/\b(min-h-dvh|h-dvh)\b/.test(cls);
    });
    expect(
      offenders,
      `${file}: use "min-h-screen min-h-dvh" (or "h-screen h-dvh") so mobile browser chrome never clips content:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });
});

describe('sticky surfaces stay layered above content', () => {
  it.each(sourceFiles)('%s gives sticky/fixed elements a z-index', (file) => {
    const offenders = classNames(read(file)).filter((cls) => {
      if (!/\b(sticky|fixed)\b/.test(cls)) return false;
      if (/pointer-events-none/.test(cls)) return false; // decorative overlays
      return !/\bz-(\[|\d|auto)/.test(cls);
    });
    expect(
      offenders,
      `${file}: sticky/fixed surfaces need an explicit z-index so headers and toolbars don't get overlapped:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });
});
