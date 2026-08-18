import { describe, expect, it } from 'vitest';
import { buildDeterministicIntent } from '../../../../supabase/functions/semantic-search/deterministic/index';

const build = (query: string) => buildDeterministicIntent(query).deterministicQuery;

describe('frame / print-treatment parsing', () => {
  it('handles English frame vocabulary', () => {
    expect(build('retro frame')).toBe('is:retro');
    expect(build('borderless cards')).toBe('border:borderless');
    expect(build('textless cards')).toBe('is:textless');
    expect(build('full art lands')).toContain('is:fullart');
  });

  it('tolerates misspellings and glued compounds', () => {
    expect(build('borderles cards')).toBe('border:borderless');
    expect(build('bordeless')).toBe('border:borderless');
    expect(build('boarderless cards')).toBe('border:borderless');
    expect(build('retroframe')).toBe('is:retro');
    expect(build('retro fram')).toBe('is:retro');
    expect(build('retro')).toBe('is:retro');
    expect(build('textles cards')).toBe('is:textless');
    expect(build('showcse cards')).toBe('is:showcase');
    expect(build('fullart lands')).toContain('is:fullart');
  });

  it('does not rewrite unrelated MTG words', () => {
    expect(build('flame cards')).not.toContain('is:retro');
    expect(build('creatures with flying')).not.toContain('border:borderless');
  });



  const LOCALIZED_RETRO: Array<[string, string]> = [
    ['es', 'marco retro'],
    ['fr', 'cadre rétro'],
    ['de', 'Retro-Rahmen'],
    ['it', 'cornice retro'],
    ['pt', 'moldura retrô'],
    ['ja', 'レトロフレーム'],
    ['ko', '레트로 프레임'],
    ['zhs', '复古边框'],
    ['zht', '復古邊框'],
    ['ru', 'ретро рамка'],
  ];

  it.each(LOCALIZED_RETRO)('resolves retro frame in %s', (_locale, query) => {
    expect(build(query)).toBe('is:retro');
  });

  const LOCALIZED_BORDERLESS: Array<[string, string]> = [
    ['es', 'sin bordes'],
    ['fr', 'cartes sans bordure'],
    ['de', 'randlose Karten'],
    ['it', 'carte senza bordi'],
    ['pt', 'cartas sem borda'],
    ['ja', 'ボーダーレス'],
    ['ko', '카드 보더리스'],
    ['zhs', '无边框卡牌'],
    ['zht', '無邊框'],
    ['ru', 'карты без рамки'],
  ];

  it.each(LOCALIZED_BORDERLESS)('resolves borderless in %s', (_locale, query) => {
    expect(build(query)).toBe('border:borderless');
  });

  it('never emits an empty name token for non-Latin queries', () => {
    for (const query of ['レトロフレーム', 'ретро рамка', '复古边框', '레트로 프레임']) {
      expect(build(query)).not.toMatch(/name:(\s|$)/);
    }
  });
});
