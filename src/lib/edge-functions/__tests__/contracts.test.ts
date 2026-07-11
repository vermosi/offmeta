import { describe, expect, it } from 'vitest';
import {
  validateComboSearchRequest,
  validateDeckCategorizeRequest,
  validateDeckSuggestRequest,
  validateFetchMoxfieldDeckRequest,
} from '@/lib/edge-functions/contracts';

describe('edge-function contracts', () => {
  it('validates deck categorization requests', () => {
    const valid = validateDeckCategorizeRequest({ cards: ['Sol Ring', 'Arcane Signet'] });
    expect(valid.ok).toBe(true);

    const invalid = validateDeckCategorizeRequest({ cards: [] });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.status).toBe(400);
    }
  });

  it('validates deck suggestion requests', () => {
    const valid = validateDeckSuggestRequest({
      commander: 'Atraxa, Praetors\' Voice',
      cards: [{ name: 'Sol Ring', category: 'Ramp' }],
      color_identity: ['W', 'U', 'B', 'G'],
      format: 'commander',
    });

    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.data.cards).toHaveLength(1);
      expect(valid.data.commander).toContain('Atraxa');
    }
  });

  it('validates moxfield deck fetch requests', () => {
    const valid = validateFetchMoxfieldDeckRequest({
      url: 'https://www.moxfield.com/decks/xqpbIjgy5UqsUBxorCsT2w',
    });

    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.data.publicId).toBe('xqpbIjgy5UqsUBxorCsT2w');
    }

    const invalid = validateFetchMoxfieldDeckRequest({ url: 'not a deck' });
    expect(invalid.ok).toBe(false);
  });

  it('validates combo search requests', () => {
    const cardLookup = validateComboSearchRequest({
      action: 'card',
      cardName: 'Dockside Extortionist',
    });
    expect(cardLookup.ok).toBe(true);

    const deckLookup = validateComboSearchRequest({
      action: 'deck',
      commanders: ['Kenrith, the Returned King'],
      cards: ['Dockside Extortionist', 'Temur Sabertooth'],
    });
    expect(deckLookup.ok).toBe(true);

    const invalid = validateComboSearchRequest({ action: 'deck', cards: [] });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.status).toBe(400);
    }
  });
});
