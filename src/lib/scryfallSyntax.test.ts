import { describe, expect, it } from 'vitest';
import {
  KNOWN_OTAGS,
  validateScryfallQuery,
  VALID_SEARCH_KEYS,
} from '@/lib/scryfallQuery';
import fs from 'node:fs';
import path from 'node:path';

const buildSampleQuery = (key: string): string => {
  if (key === 'is') return 'is:commander';
  if (key === 'not') return 'not:token';
  if (key === 'has') return 'has:foil';
  if (key === 'otag' || key === 'oracletag') return 'otag:draw';
  if (key === 'c' || key === 'color') return `${key}:r`;
  if (key === 'id' || key === 'identity' || key === 'ci') return `${key}:br`;
  if (key === 'mv' || key === 'cmc' || key === 'manavalue') return `${key}>=3`;
  if (key === 'power' || key === 'pow') return `${key}>=2`;
  if (key === 'toughness' || key === 'tou') return `${key}>=2`;
  if (key === 'loyalty' || key === 'loy') return `${key}>=3`;
  if (key === 'year') return `${key}>=2020`;
  if (key === 'date') return `${key}>=2020-01-01`;
  if (key === 'usd' || key === 'eur' || key === 'tix') return `${key}<=5`;
  return `${key}:test`;
};

describe('Scryfall syntax reference coverage', () => {
  it('accepts all supported search keys', () => {
    for (const key of VALID_SEARCH_KEYS) {
      const query = buildSampleQuery(key);
      const result = validateScryfallQuery(query);
      expect(result.sanitized).toContain(query);
    }
  });

  it('preserves regex queries', () => {
    const regexQueries = [
      'o:/draw (a|two) cards?/',
      'name:/^goblin/',
      't:/dragon/',
      'o:/destroy target (creature|artifact)/',
      'o:/draw OR discard/',
    ];

    for (const query of regexQueries) {
      const result = validateScryfallQuery(query);
      expect(result.sanitized).toContain(query);
    }
  });

  it('accepts known oracle tags', () => {
    for (const tag of KNOWN_OTAGS) {
      const query = `otag:${tag}`;
      const result = validateScryfallQuery(query);
      expect(result.sanitized).toContain(query);
    }
  });
});

describe('Scryfall tagger tags', () => {
  const taggerPath = path.resolve(
    process.cwd(),
    'src/data/scryfall-tagger-tags.txt',
  );
  const rawTags = fs.readFileSync(taggerPath, 'utf8');
  const tags = Array.from(new Set(rawTags.match(/[a-z0-9-]+/g) || [])).filter(
    (tag) => tag.length >= 2,
  );

  it('loads tagger tags reference list', () => {
    expect(tags.length).toBeGreaterThan(0);
    expect(tags).toContain('cow');
  });

  it('preserves tagger tags in atag queries', () => {
    for (const tag of tags) {
      const query = `atag:${tag}`;
      const result = validateScryfallQuery(query);
      expect(result.sanitized).toContain(query);
    }
  });
});
