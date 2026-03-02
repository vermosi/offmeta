import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearchHistory } from '../useSearchHistory';

describe('useSearchHistory', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with empty history', () => {
    const { result } = renderHook(() => useSearchHistory());
    expect(result.current.history).toEqual([]);
  });

  it('adds a query to history', () => {
    const { result } = renderHook(() => useSearchHistory());
    act(() => result.current.addToHistory('green ramp'));
    expect(result.current.history).toContain('green ramp');
  });

  it('deduplicates queries case-insensitively', () => {
    const { result } = renderHook(() => useSearchHistory());
    act(() => result.current.addToHistory('Green Ramp'));
    act(() => result.current.addToHistory('green ramp'));
    expect(result.current.history.length).toBe(1);
  });

  it('most recent query is first', () => {
    const { result } = renderHook(() => useSearchHistory());
    act(() => result.current.addToHistory('first'));
    act(() => result.current.addToHistory('second'));
    expect(result.current.history[0]).toBe('second');
  });

  it('removes a query from history', () => {
    const { result } = renderHook(() => useSearchHistory());
    act(() => result.current.addToHistory('to remove'));
    act(() => result.current.removeFromHistory('to remove'));
    expect(result.current.history).not.toContain('to remove');
  });

  it('clears all history', () => {
    const { result } = renderHook(() => useSearchHistory());
    act(() => result.current.addToHistory('one'));
    act(() => result.current.addToHistory('two'));
    act(() => result.current.clearHistory());
    expect(result.current.history).toEqual([]);
  });

  it('ignores empty strings', () => {
    const { result } = renderHook(() => useSearchHistory());
    act(() => result.current.addToHistory(''));
    act(() => result.current.addToHistory('   '));
    expect(result.current.history).toEqual([]);
  });

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useSearchHistory());
    act(() => result.current.addToHistory('persisted'));
    const stored = JSON.parse(localStorage.getItem('offmeta_search_history') || '[]');
    expect(stored).toContain('persisted');
  });

  it('handles localStorage errors gracefully', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const { result } = renderHook(() => useSearchHistory());
    expect(() => {
      act(() => result.current.addToHistory('test'));
    }).not.toThrow();
    spy.mockRestore();
  });
});
