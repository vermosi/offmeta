import { describe, it, expect } from 'vitest';
import {
  extractOtags,
  findUnknownOtags,
  isKnownOracleTag,
  suggestOracleTags,
  validateOtags,
  findUnknownArtTags,
  suggestArtTags,
} from '../../../../supabase/functions/_shared/otagValidation.ts';

describe('otag validation', () => {
  it('extracts otag, oracletag and function values', () => {
    expect(extractOtags('otag:ramp oracletag:cantrip function:tutor')).toEqual([
      'ramp',
      'cantrip',
      'tutor',
    ]);
  });

  it('accepts real Scryfall tagger tags', () => {
    expect(isKnownOracleTag('ramp')).toBe(true);
    expect(isKnownOracleTag('board-wipe')).toBe(true);
    expect(findUnknownOtags('otag:ramp c:g')).toEqual([]);
  });

  it('rejects hallucinated tags', () => {
    expect(isKnownOracleTag('draw-spells-that-are-cheap')).toBe(false);
    const result = validateOtags('otag:draw-spells-that-are-cheap');
    expect(result.valid).toBe(false);
    expect(result.unknownTags).toEqual(['draw-spells-that-are-cheap']);
    expect(result.reason).toContain('does not exist');
  });

  it('suggests close real tags', () => {
    expect(suggestOracleTags('ramps').length).toBeGreaterThan(0);
  });

  it('does not treat art tags as oracle tags', () => {
    expect(isKnownOracleTag('aang')).toBe(false);
  });
});

describe('art tag validation', () => {
  it('accepts real art tags', () => {
    expect(findUnknownArtTags('atag:cow c:g')).toEqual([]);
    expect(findUnknownArtTags('art:skull')).toEqual([]);
  });

  it('rejects hallucinated art tags and suggests alternatives', () => {
    const result = validateOtags('atag:heroic-pose-of-victory');
    expect(result.valid).toBe(false);
    expect(result.unknownArtTags).toContain('heroic-pose-of-victory');
  });

  it('does not treat artist: as an art tag', () => {
    expect(findUnknownArtTags('artist:"rebecca guay"')).toEqual([]);
  });

  it('suggests close art tags', () => {
    expect(suggestArtTags('dragons').length).toBeGreaterThan(0);
  });
});
