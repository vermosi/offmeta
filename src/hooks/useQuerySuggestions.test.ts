import { describe, expect, it } from 'vitest';
import { scoreSuggestion } from './useQuerySuggestions';

describe('scoreSuggestion', () => {
  it('prefers useful result counts over extremely broad suggestions', () => {
    const useful = scoreSuggestion(
      't:instant c:u o:counter',
      't:instant c:u o:counter',
      50,
    );
    const broad = scoreSuggestion(
      't:instant c:u o:counter',
      't:instant c:u o:counter',
      5000,
    );
    expect(useful).toBeGreaterThan(broad);
  });

  it('measures retained tokens rather than query length', () => {
    const retained = scoreSuggestion('blue counter spells', 'blue counter', 50);
    const unrelated = scoreSuggestion(
      'blue counter spells',
      'green creature',
      50,
    );
    expect(retained).toBeGreaterThan(unrelated);
  });
});
