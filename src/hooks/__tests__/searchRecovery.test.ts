import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleZeroResultRecovery } from '@/hooks/searchRecovery';

const resolveFuzzyCardName = vi.fn();
const buildClientFallbackQuery = vi.fn();

vi.mock('@/lib/scryfall/client', () => ({
  resolveFuzzyCardName: (...args: unknown[]) => resolveFuzzyCardName(...args),
}));

vi.mock('@/lib/search/fallback', () => ({
  extractCardNameCandidate: (query: string) =>
    query.toLowerCase().includes('slickshot show off') ? 'slickshot show off' : null,
  buildClientFallbackQuery: (...args: unknown[]) => buildClientFallbackQuery(...args),
}));

describe('handleZeroResultRecovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tries fuzzy exact-name recovery for deterministic card-name queries', async () => {
    resolveFuzzyCardName.mockResolvedValue('Slickshot Show-Off');
    buildClientFallbackQuery.mockReturnValue('!"Slickshot Show-Off"');

    const setSearchQuery = vi.fn();
    const setLastSearchResult = vi.fn();
    const queryClient = { invalidateQueries: vi.fn() } as never;
    const trackEvent = vi.fn();

    const result = await handleZeroResultRecovery(
      {
        originalQuery: 'slickshot show off',
        currentResult: {
          scryfallQuery: 'o:"slickshot"',
          source: 'deterministic',
        },
        currentRequestId: 'req-1',
        scryfallLang: 'en',
        queryClient,
        setSearchQuery,
        setLastSearchResult,
        trackEvent,
      },
      false,
    );

    expect(result.handled).toBe(true);
    expect(resolveFuzzyCardName).toHaveBeenCalledWith('slickshot show off');
    expect(setSearchQuery).toHaveBeenCalledWith('!"Slickshot Show-Off"');
  });
});
