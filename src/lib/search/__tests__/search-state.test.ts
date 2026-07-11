import { describe, expect, it } from 'vitest';
import {
  encodeFiltersToUrl,
  parseFiltersFromUrl,
} from '@/lib/search/search-state';

describe('search-state helpers', () => {
  it('round-trips core filter params', () => {
    const params = new URLSearchParams(
      'colors=g,u&types=creature,artifact&sort=cmc-desc&cmc_min=2&cmc_max=5&format=commander',
    );
    const parsed = parseFiltersFromUrl(params);

    expect(parsed).toEqual({
      colors: ['g', 'u'],
      types: ['creature', 'artifact'],
      sortBy: 'cmc-desc',
      format: 'commander',
      cmcRange: [2, 5],
    });

    const next = new URLSearchParams();
    if (parsed) {
      encodeFiltersToUrl(next, parsed as never);
    }

    expect(next.get('colors')).toBe('g,u');
    expect(next.get('types')).toBe('creature,artifact');
    expect(next.get('sort')).toBe('cmc-desc');
    expect(next.get('cmc_min')).toBe('2');
    expect(next.get('cmc_max')).toBe('5');
    expect(next.get('format')).toBe('commander');
  });
});
