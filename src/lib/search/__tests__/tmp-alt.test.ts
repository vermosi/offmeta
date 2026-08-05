import { describe, it } from 'vitest';
import { buildClientFallbackQuery, extractCardNameCandidate, isLikelyCardName } from '@/lib/search/fallback';
describe('alt', () => { it('x', () => {
  const q = 'budget alternatives to rhystic study';
  console.log('fallback:', buildClientFallbackQuery(q));
  console.log('cardName:', extractCardNameCandidate(q));
  console.log('isLikelyCardName:', isLikelyCardName(q));
}); });
