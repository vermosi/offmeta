import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCompare } from '../useCompare';
import type { ScryfallCard } from '@/types/card';

function makeCard(id: string): ScryfallCard {
  return { id, name: `Card ${id}`, set: 'tst', rarity: 'common' } as ScryfallCard;
}

describe('useCompare', () => {
  it('starts with empty state', () => {
    const { result } = renderHook(() => useCompare());
    expect(result.current.compareCards).toEqual([]);
    expect(result.current.isComparing).toBe(false);
    expect(result.current.compareOpen).toBe(false);
  });

  it('toggles a card into the compare list', () => {
    const { result } = renderHook(() => useCompare());
    act(() => result.current.toggleCompareCard(makeCard('a')));
    expect(result.current.compareCards).toHaveLength(1);
    expect(result.current.isComparing).toBe(true);
  });

  it('toggles a card out when already selected', () => {
    const { result } = renderHook(() => useCompare());
    act(() => result.current.toggleCompareCard(makeCard('a')));
    act(() => result.current.toggleCompareCard(makeCard('a')));
    expect(result.current.compareCards).toHaveLength(0);
  });

  it('enforces max of 4 cards', () => {
    const { result } = renderHook(() => useCompare());
    act(() => {
      result.current.toggleCompareCard(makeCard('1'));
      result.current.toggleCompareCard(makeCard('2'));
      result.current.toggleCompareCard(makeCard('3'));
      result.current.toggleCompareCard(makeCard('4'));
    });
    act(() => result.current.toggleCompareCard(makeCard('5')));
    expect(result.current.compareCards).toHaveLength(4);
  });

  it('removes a specific card by id', () => {
    const { result } = renderHook(() => useCompare());
    act(() => {
      result.current.toggleCompareCard(makeCard('a'));
      result.current.toggleCompareCard(makeCard('b'));
    });
    act(() => result.current.removeCompareCard('a'));
    expect(result.current.compareCards).toHaveLength(1);
    expect(result.current.compareCards[0].id).toBe('b');
  });

  it('clears all cards and closes modal', () => {
    const { result } = renderHook(() => useCompare());
    act(() => {
      result.current.toggleCompareCard(makeCard('a'));
      result.current.toggleCompareCard(makeCard('b'));
    });
    act(() => result.current.clearCompare());
    expect(result.current.compareCards).toHaveLength(0);
    expect(result.current.compareOpen).toBe(false);
  });

  it('opens compare modal only with 2+ cards', () => {
    const { result } = renderHook(() => useCompare());
    act(() => result.current.openCompare());
    expect(result.current.compareOpen).toBe(false);

    act(() => {
      result.current.toggleCompareCard(makeCard('a'));
      result.current.toggleCompareCard(makeCard('b'));
    });
    act(() => result.current.openCompare());
    expect(result.current.compareOpen).toBe(true);
  });

  it('closes compare modal', () => {
    const { result } = renderHook(() => useCompare());
    act(() => {
      result.current.toggleCompareCard(makeCard('a'));
      result.current.toggleCompareCard(makeCard('b'));
    });
    act(() => result.current.openCompare());
    act(() => result.current.closeCompare());
    expect(result.current.compareOpen).toBe(false);
  });

  it('isCardSelected returns correct boolean', () => {
    const { result } = renderHook(() => useCompare());
    act(() => result.current.toggleCompareCard(makeCard('a')));
    expect(result.current.isCardSelected('a')).toBe(true);
    expect(result.current.isCardSelected('b')).toBe(false);
  });
});
