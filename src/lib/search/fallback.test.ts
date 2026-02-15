import { describe, it, expect } from 'vitest';
import { buildClientFallbackQuery } from './fallback';

describe('buildClientFallbackQuery', () => {
  it('translates "mana rocks" to artifact search', () => {
    const q = buildClientFallbackQuery('mana rocks');
    expect(q).toContain('t:artifact');
    expect(q).toContain('o:"add"');
  });

  it('translates "board wipes" to boardwipe tag', () => {
    expect(buildClientFallbackQuery('board wipes')).toContain('otag:boardwipe');
  });

  it('translates color words', () => {
    expect(buildClientFallbackQuery('green creatures')).toContain('c:g');
    expect(buildClientFallbackQuery('green creatures')).toContain('t:creature');
  });

  it('translates type words', () => {
    expect(buildClientFallbackQuery('artifacts')).toContain('t:artifact');
    expect(buildClientFallbackQuery('enchantments')).toContain('t:enchantment');
    expect(buildClientFallbackQuery('sorceries')).toContain('t:sorcery');
  });

  it('translates cost words', () => {
    expect(buildClientFallbackQuery('cheap creatures')).toContain('mv<=3');
    expect(buildClientFallbackQuery('expensive spells')).toContain('mv>=6');
  });

  it('handles treasure tokens', () => {
    const q = buildClientFallbackQuery('creatures that make treasure tokens');
    expect(q).toContain('t:creature');
    expect(q).toContain('o:"create"');
    expect(q).toContain('o:"treasure"');
  });

  it('falls back to oracle search for unmatched terms', () => {
    expect(buildClientFallbackQuery('xyzzy')).toBe('o:"xyzzy"');
  });

  it('handles empty-ish input', () => {
    expect(buildClientFallbackQuery('')).toBe('');
    expect(buildClientFallbackQuery('   ')).toBe('');
  });

  it('handles multiple slang terms', () => {
    const q = buildClientFallbackQuery('counterspells and removal');
    expect(q).toContain('otag:counter');
    expect(q).toContain('otag:removal');
  });

  it('strips filler words from residual', () => {
    const q = buildClientFallbackQuery('red creatures that deal damage');
    expect(q).toContain('c:r');
    expect(q).toContain('t:creature');
    // "that" and "deal" should be cleaned
    expect(q).not.toContain('"that"');
  });

  it('translates ramp', () => {
    expect(buildClientFallbackQuery('ramp')).toContain('otag:ramp');
  });

  it('translates mill', () => {
    expect(buildClientFallbackQuery('mill')).toContain('otag:mill');
  });

  it('translates blink', () => {
    expect(buildClientFallbackQuery('blink')).toContain('otag:blink');
  });

  it('handles all color words', () => {
    expect(buildClientFallbackQuery('white')).toContain('c:w');
    expect(buildClientFallbackQuery('blue')).toContain('c:u');
    expect(buildClientFallbackQuery('black')).toContain('c:b');
    expect(buildClientFallbackQuery('red')).toContain('c:r');
    expect(buildClientFallbackQuery('colorless')).toContain('c:c');
  });
});
