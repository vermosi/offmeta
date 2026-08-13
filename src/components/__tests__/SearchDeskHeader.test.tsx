import { describe, expect, it } from 'vitest';
import { buildInterpretation } from '@/lib/search/interpretation';
import type { SearchIntent } from '@/types/search';

const baseIntent: SearchIntent = {
  colors: null,
  types: [],
  cmc: null,
  power: null,
  toughness: null,
  tags: [],
  oraclePatterns: [],
  warnings: [],
};

describe('buildInterpretation', () => {
  it('returns nothing without an intent', () => {
    expect(buildInterpretation(null)).toEqual([]);
  });

  it('reads colors, types and mana value', () => {
    const rows = buildInterpretation({
      ...baseIntent,
      colors: { values: ['R'], isIdentity: false, isExact: false, isOr: false },
      types: ['Creature'],
      cmc: { op: '<=', value: 2 },
    });
    expect(rows).toEqual([
      { kind: 'colors', value: 'red' },
      { kind: 'type', value: 'creature' },
      { kind: 'mana value', value: '<= 2' },
    ]);
  });

  it('cleans oracle prefixes and quotes', () => {
    const rows = buildInterpretation({
      ...baseIntent,
      oraclePatterns: ['o:"Treasure token"'],
    });
    expect(rows[0]).toEqual({ kind: 'oracle text', value: '“Treasure token”' });
  });

  it('caps the readout at 12 rows', () => {
    const rows = buildInterpretation({
      ...baseIntent,
      types: Array.from({ length: 20 }, (_, i) => `type${i}`),
    });
    expect(rows).toHaveLength(12);
  });
});
