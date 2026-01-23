import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  relaxSpeculativeClauses,
  validateAgainstScryfall,
} from '../../supabase/functions/semantic-search/scryfall.ts';

// Mock fetchWithRetry
const mockFetch = vi.fn();
vi.mock('../../supabase/functions/semantic-search/utils.ts', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchWithRetry: (...args: any[]) => mockFetch(...args),
}));

describe('Semantic Search Scryfall Utils', () => {
  describe('relaxSpeculativeClauses', () => {
    it('removes speculative clauses', () => {
      const query = 't:creature is:reprint usd<10';
      const { relaxedQuery, removed } = relaxSpeculativeClauses(query);
      expect(relaxedQuery).toBe('t:creature');
      expect(removed).toContain('is:reprint');
      expect(removed).toContain('usd<10');
    });

    it('leaves non-speculative clauses', () => {
      const query = 't:creature o:flying';
      const { relaxedQuery, removed } = relaxSpeculativeClauses(query);
      expect(relaxedQuery).toBe('t:creature o:flying');
      expect(removed).toHaveLength(0);
    });
  });

  describe('validateAgainstScryfall', () => {
    beforeEach(() => {
      mockFetch.mockReset();
    });

    it('returns ok on 200', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        json: async () => ({ total_cards: 100, warnings: [] }),
      });

      const result = await validateAgainstScryfall('t:creature', 1000);
      expect(result.ok).toBe(true);
      expect(result.totalCards).toBe(100);
    });

    it('returns zero results on 404', async () => {
      mockFetch.mockResolvedValue({
        status: 404,
      });

      const result = await validateAgainstScryfall('t:invalid', 1000);
      expect(result.zeroResults).toBe(true);
      expect(result.ok).toBe(false);
    });
  });
});
