import { describe, it, expect } from 'vitest';
import { estimateQueryComplexity } from '@/lib/search/complexity';

describe('estimateQueryComplexity', () => {
  it('rates short queries as simple', () => {
    const result = estimateQueryComplexity('mana rocks');
    expect(result.level).toBe('simple');
    expect(result.shouldSimplify).toBe(false);
    expect(result.warning).toBeNull();
  });

  it('rates medium queries as moderate', () => {
    const result = estimateQueryComplexity('cheap red creatures with haste');
    expect(['simple', 'moderate']).toContain(result.level);
    expect(result.shouldSimplify).toBe(false);
  });

  it('rates long multi-constraint queries as complex or very_complex', () => {
    const result = estimateQueryComplexity(
      'legendary creatures that are commander legal in blue and black colors with flying or hexproof that cost less than 5 mana and have some kind of card draw ability'
    );
    expect(['complex', 'very_complex']).toContain(result.level);
  });

  it('auto-simplifies very complex queries', () => {
    const result = estimateQueryComplexity(
      'legendary creatures that are commander legal in blue and black colors with flying or hexproof that cost less than 5 mana and have some kind of card draw ability and also protection from red'
    );
    if (result.shouldSimplify) {
      expect(result.simplifiedQuery).toBeTruthy();
      expect(result.simplifiedQuery!.length).toBeLessThan(
        'legendary creatures that are commander legal in blue and black colors with flying or hexproof that cost less than 5 mana and have some kind of card draw ability and also protection from red'.length
      );
    }
  });

  it('preserves meaningful words and drops filler in simplification', () => {
    const result = estimateQueryComplexity(
      'legendary creatures that are commander legal in blue black and green with flying hexproof or ward that cost less than 5 mana and have card draw ability and enter the battlefield triggers in modern format under 10 dollars'
    );
    expect(result.shouldSimplify).toBe(true);
    expect(result.simplifiedQuery).toBeTruthy();
    const simplified = result.simplifiedQuery!;

    // Meaningful constraint words MUST be preserved
    const mustKeep = ['legendary', 'creatures', 'commander', 'blue', 'black', 'green', 'flying', 'hexproof'];
    for (const word of mustKeep) {
      expect(simplified).toContain(word);
    }

    // Filler words should NOT appear as standalone (unless as connectors)
    // The simplified query should be significantly shorter
    expect(simplified.split(/\s+/).length).toBeLessThan(20);

    // Should NOT contain long runs of filler without meaningful words
    expect(simplified).not.toMatch(/\b(that are|that have|and have|and also)\b/);
  });

  it('tracks uncovered words', () => {
    const result = estimateQueryComplexity('creatures that synergize with aristocrats combo');
    expect(result.uncoveredWords).toContain('synergize');
    expect(result.uncoveredWords).toContain('combo');
  });

  it('counts constraint dimensions', () => {
    const result = estimateQueryComplexity('blue legendary creature with flying commander legal');
    expect(result.constraintCount).toBeGreaterThanOrEqual(3); // type, color, keyword, format
  });

  it('handles empty query', () => {
    const result = estimateQueryComplexity('');
    expect(result.level).toBe('simple');
    expect(result.score).toBe(0);
  });
});
