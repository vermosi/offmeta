/**
 * Tests for useOnboarding hook.
 * @module hooks/__tests__/useOnboarding.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnboarding } from '../useOnboarding';

const STORAGE_KEY = 'offmeta_onboarding_done';

describe('useOnboarding', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('activates after delay for first-time visitors', () => {
    const { result } = renderHook(() => useOnboarding());

    expect(result.current.isActive).toBe(false);
    act(() => { vi.advanceTimersByTime(900); });
    expect(result.current.isActive).toBe(true);
    expect(result.current.step).toBe(1);
  });

  it('does not activate when onboarding was already completed', () => {
    localStorage.setItem(STORAGE_KEY, '1');
    const { result } = renderHook(() => useOnboarding());

    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.isActive).toBe(false);
  });

  it('advances through steps', () => {
    const { result } = renderHook(() => useOnboarding());
    act(() => { vi.advanceTimersByTime(900); });

    expect(result.current.step).toBe(1);
    act(() => { result.current.advance(); });
    expect(result.current.step).toBe(2);
    act(() => { result.current.advance(); });
    expect(result.current.step).toBe(3);
  });

  it('completes on final advance and persists', () => {
    const { result } = renderHook(() => useOnboarding());
    act(() => { vi.advanceTimersByTime(900); });

    act(() => { result.current.advance(); }); // step 2
    act(() => { result.current.advance(); }); // step 3
    act(() => { result.current.advance(); }); // complete

    expect(result.current.isActive).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('1');
  });

  it('dismiss deactivates and persists', () => {
    const { result } = renderHook(() => useOnboarding());
    act(() => { vi.advanceTimersByTime(900); });

    expect(result.current.isActive).toBe(true);
    act(() => { result.current.dismiss(); });
    expect(result.current.isActive).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('1');
  });
});
