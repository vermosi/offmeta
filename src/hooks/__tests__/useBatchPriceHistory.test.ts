import { describe, expect, it } from 'vitest';
import { normalizeBatchPriceHistoryNames } from '../useBatchPriceHistory';

describe('normalizeBatchPriceHistoryNames', () => {
  it('deduplicates, trims, and sorts card names', () => {
    expect(
      normalizeBatchPriceHistoryNames([
        ' Sol Ring ',
        'Rhystic Study',
        'Sol Ring',
        '',
        'Arcane Signet',
      ]),
    ).toEqual(['Arcane Signet', 'Rhystic Study', 'Sol Ring']);
  });
});
