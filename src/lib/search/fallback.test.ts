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

  // New: guild colors
  it('translates guild color pairs', () => {
    expect(buildClientFallbackQuery('azorius creatures')).toContain('id<=wu');
    expect(buildClientFallbackQuery('simic creatures')).toContain('id<=gu');
    expect(buildClientFallbackQuery('rakdos creatures')).toContain('id<=br');
  });

  // New: keywords
  it('translates keyword abilities', () => {
    expect(buildClientFallbackQuery('creatures with flying')).toContain('kw:flying');
    expect(buildClientFallbackQuery('deathtouch creatures')).toContain('kw:deathtouch');
    expect(buildClientFallbackQuery('haste')).toContain('kw:haste');
  });

  it('translates multi-word keywords', () => {
    expect(buildClientFallbackQuery('creatures with double strike')).toContain('kw:double-strike');
    expect(buildClientFallbackQuery('first strike creatures')).toContain('kw:first-strike');
  });

  // New: formats
  it('translates format words', () => {
    expect(buildClientFallbackQuery('commander creatures')).toContain('f:commander');
    expect(buildClientFallbackQuery('modern artifacts')).toContain('f:modern');
    expect(buildClientFallbackQuery('pauper removal')).toContain('f:pauper');
  });

  // New: equipment/aura types
  it('translates equipment and aura types', () => {
    expect(buildClientFallbackQuery('equipment')).toContain('t:equipment');
    expect(buildClientFallbackQuery('auras')).toContain('t:aura');
  });

  // New: pre-translated guide queries
  it('returns pre-translated guide queries exactly', () => {
    expect(buildClientFallbackQuery('dragons')).toBe('t:dragon');
    expect(buildClientFallbackQuery('mono red creatures')).toBe('id=r t:creature');
    expect(buildClientFallbackQuery('landfall cards legal in commander')).toBe('otag:landfall f:commander');
    expect(buildClientFallbackQuery('utility lands for commander in esper under $5'))
      .toBe('t:land -t:basic id<=wub f:commander usd<5');
  });

  // New: pre-translated archetype queries
  it('returns pre-translated archetype queries exactly', () => {
    expect(buildClientFallbackQuery('treasure token cards legal in commander'))
      .toBe('o:"treasure" o:"token" f:commander');
    expect(buildClientFallbackQuery('chaos cards legal in commander'))
      .toBe('(o:"coin" or o:"random" or o:"chaos") f:commander');
  });

  // New: archetype slang
  it('translates archetype slang', () => {
    expect(buildClientFallbackQuery('voltron')).toContain('(t:equipment or t:aura)');
    expect(buildClientFallbackQuery('aristocrats')).toContain('o:"when" o:"dies"');
  });
});
