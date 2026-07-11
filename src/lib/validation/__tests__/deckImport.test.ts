import { describe, expect, it } from 'vitest';
import { ImportedDeckStruct } from '@/lib/validation/deckImport';

describe('imported deck schema', () => {
  it('accepts a valid imported deck shape', () => {
    const deck = ImportedDeckStruct.create({
      name: 'Good Stuff',
      format: 'commander',
      commander: 'Atraxa, Praetors\' Voice',
      cards: [{ name: 'Sol Ring', quantity: 1 }],
    });

    expect(deck.name).toBe('Good Stuff');
    expect(deck.cards[0].quantity).toBe(1);
  });
});

