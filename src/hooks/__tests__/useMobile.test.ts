import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from '../useMobile';

describe('useIsMobile', () => {
  let listeners: Array<() => void>;

  beforeEach(() => {
    listeners = [];
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (_: string, cb: () => void) => listeners.push(cb),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it('returns false for desktop width', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024 });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('returns true for mobile width', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375 });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('updates when window resizes', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024 });
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      listeners.forEach((cb) => cb());
    });
    expect(result.current).toBe(true);
  });
});
