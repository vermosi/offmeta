import { describe, expect, it } from 'vitest';
import { buildActiveDeckFilters } from '@/pages/browse-decks-utils';

describe('buildActiveDeckFilters', () => {
  it('omits empty filters', () => {
    expect(
      buildActiveDeckFilters({
        nameFilter: '  ',
        formatFilter: '',
        colorFilter: [],
        tagFilter: [],
      }),
    ).toEqual([]);
  });

  it('summarizes the active deck filters for the mobile filter rail', () => {
    expect(
      buildActiveDeckFilters({
        nameFilter: 'dragons',
        formatFilter: 'commander',
        colorFilter: ['R', 'G'],
        tagFilter: ['tribal', 'ramp'],
      }),
    ).toEqual([
      'Name: dragons',
      'Format: commander',
      'Colors: R, G',
      'Tags: tribal, ramp',
    ]);
  });
});
