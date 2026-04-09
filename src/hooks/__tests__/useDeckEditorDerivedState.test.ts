import { renderHook } from '@testing-library/react';
import { useDeckEditorDerivedState, type DeckCard } from '@/hooks';

const cards = [
  {
    id: '1',
    card_name: 'Sol Ring',
    quantity: 1,
    board: 'mainboard',
    category: 'Ramp',
    is_commander: false,
  },
  {
    id: '2',
    card_name: 'Arcane Signet',
    quantity: 2,
    board: 'mainboard',
    category: 'Ramp',
    is_commander: false,
  },
  {
    id: '3',
    card_name: "Atraxa, Praetors' Voice",
    quantity: 1,
    board: 'mainboard',
    category: null,
    is_commander: true,
  },
  {
    id: '4',
    card_name: 'Swords to Plowshares',
    quantity: 1,
    board: 'sideboard',
    category: 'Removal',
    is_commander: false,
  },
  {
    id: '5',
    card_name: 'Counterspell',
    quantity: 3,
    board: 'maybeboard',
    category: 'Interaction',
    is_commander: false,
  },
] as unknown as DeckCard[];

describe('useDeckEditorDerivedState', () => {
  it('separates cards by board and totals quantities', () => {
    const { result } = renderHook(() =>
      useDeckEditorDerivedState({
        cards,
        deckFormat: 'commander',
        deckSortMode: 'category',
        scryfallCache: new Map(),
      }),
    );

    expect(result.current.mainboardCards).toHaveLength(3);
    expect(result.current.sideboardCards).toHaveLength(1);
    expect(result.current.maybeboardCards).toHaveLength(1);
    expect(result.current.totalMainboard).toBe(4);
    expect(result.current.totalSideboard).toBe(1);
    expect(result.current.totalMaybeboard).toBe(3);
  });

  it('groups commander cards under Commander category', () => {
    const { result } = renderHook(() =>
      useDeckEditorDerivedState({
        cards,
        deckFormat: 'commander',
        deckSortMode: 'category',
        scryfallCache: new Map(),
      }),
    );

    const commanderGroup = result.current.grouped.find(
      ([category]) => category === 'Commander',
    );
    expect(commanderGroup?.[1]).toHaveLength(1);
    expect(commanderGroup?.[1][0].card_name).toContain('Atraxa');
  });
});
