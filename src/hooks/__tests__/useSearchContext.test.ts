import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearchContext } from '../useSearchContext';

describe('useSearchContext', () => {
  it('starts with null context', () => {
    const { result } = renderHook(() => useSearchContext());
    expect(result.current.getContext()).toBeNull();
  });

  it('saves and retrieves context', () => {
    const { result } = renderHook(() => useSearchContext());
    act(() => result.current.saveContext('green ramp', 't:creature c:g'));
    const ctx = result.current.getContext();
    expect(ctx).toEqual({
      previousQuery: 'green ramp',
      previousScryfall: 't:creature c:g',
    });
  });

  it('overwrites previous context', () => {
    const { result } = renderHook(() => useSearchContext());
    act(() => result.current.saveContext('first', 'q1'));
    act(() => result.current.saveContext('second', 'q2'));
    expect(result.current.getContext()?.previousQuery).toBe('second');
  });
});
