import { describe, it, expect } from 'vitest';
import { extractSubtypes } from '../../../../supabase/functions/semantic-search/pipeline/slots/extract-types.ts';

describe('extractSubtypes', () => {
  it('resolves common subtypes from the curated list', () => {
    expect(extractSubtypes('goblins').subtypes).toContain('goblin');
  });

  it('resolves uncommon tribes from the generated Scryfall catalog', () => {
    expect(extractSubtypes('creature monkey').subtypes).toContain('monkey');
    expect(extractSubtypes('ape tribal').subtypes).toContain('ape');
  });

  it('singularizes catalog matches', () => {
    expect(extractSubtypes('monkeys').subtypes).toContain('monkey');
    expect(extractSubtypes('phyrexians').subtypes).toContain('phyrexian');
  });

  it('consumes the matched word from the remaining query', () => {
    const result = extractSubtypes('cheap monkey');
    expect(result.remaining).not.toMatch(/monkey/i);
  });

  it('never hijacks plain English or mechanics vocabulary', () => {
    for (const query of [
      'cards that give ward',
      'wall of text',
      'time to draw cards',
      'scout the battlefield',
      'noble sacrifice outlets',
    ]) {
      expect(extractSubtypes(query).subtypes).toHaveLength(0);
    }
  });

  it('ignores very short tokens', () => {
    expect(extractSubtypes('a an of').subtypes).toHaveLength(0);
  });
});
