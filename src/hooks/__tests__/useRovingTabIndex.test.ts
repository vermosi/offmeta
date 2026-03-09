/**
 * Tests for useRovingTabIndex hook.
 * @module hooks/__tests__/useRovingTabIndex.test
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRovingTabIndex } from '../useRovingTabIndex';

describe('useRovingTabIndex', () => {
  it('initializes activeIndex to 0', () => {
    const { result } = renderHook(() =>
      useRovingTabIndex({ itemCount: 5 }),
    );
    expect(result.current.activeIndex).toBe(0);
  });

  it('getTabIndex returns 0 for active, -1 for others', () => {
    const { result } = renderHook(() =>
      useRovingTabIndex({ itemCount: 3 }),
    );
    expect(result.current.getTabIndex(0)).toBe(0);
    expect(result.current.getTabIndex(1)).toBe(-1);
    expect(result.current.getTabIndex(2)).toBe(-1);
  });

  it('resets activeIndex when itemCount changes', () => {
    const { result, rerender } = renderHook(
      ({ count }) => useRovingTabIndex({ itemCount: count }),
      { initialProps: { count: 5 } },
    );

    // Simulate focus change via onFocus
    const props = result.current.getRovingProps(3);
    act(() => { props.onFocus(); });
    expect(result.current.activeIndex).toBe(3);

    // Change item count
    rerender({ count: 10 });
    expect(result.current.activeIndex).toBe(0);
  });

  it('resetIndex sets index to 0', () => {
    const { result } = renderHook(() =>
      useRovingTabIndex({ itemCount: 5 }),
    );

    const props = result.current.getRovingProps(3);
    act(() => { props.onFocus(); });
    expect(result.current.activeIndex).toBe(3);

    act(() => { result.current.resetIndex(); });
    expect(result.current.activeIndex).toBe(0);
  });

  it('getRovingProps returns correct shape', () => {
    const { result } = renderHook(() =>
      useRovingTabIndex({ itemCount: 3 }),
    );

    const props = result.current.getRovingProps(1);
    expect(props.tabIndex).toBe(-1);
    expect(props['data-roving-index']).toBe(1);
    expect(typeof props.onKeyDown).toBe('function');
    expect(typeof props.onFocus).toBe('function');
    expect(typeof props.ref).toBe('function');
  });

  it('calls onActivate on Enter key', () => {
    const onActivate = vi.fn();
    const { result } = renderHook(() =>
      useRovingTabIndex({ itemCount: 3, onActivate }),
    );

    const props = result.current.getRovingProps(1);
    const event = {
      key: 'Enter',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;

    act(() => { props.onKeyDown(event); });
    expect(onActivate).toHaveBeenCalledWith(1);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('calls onActivate on Space key', () => {
    const onActivate = vi.fn();
    const { result } = renderHook(() =>
      useRovingTabIndex({ itemCount: 3, onActivate }),
    );

    const props = result.current.getRovingProps(2);
    const event = {
      key: ' ',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;

    act(() => { props.onKeyDown(event); });
    expect(onActivate).toHaveBeenCalledWith(2);
  });

  it('navigates with arrow keys', () => {
    const { result } = renderHook(() =>
      useRovingTabIndex({ itemCount: 5 }),
    );

    // ArrowRight moves forward
    const props0 = result.current.getRovingProps(0);
    act(() => {
      props0.onKeyDown({
        key: 'ArrowRight',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.activeIndex).toBe(1);
  });

  it('does not navigate beyond bounds', () => {
    const { result } = renderHook(() =>
      useRovingTabIndex({ itemCount: 3 }),
    );

    // Try ArrowLeft from index 0
    const props = result.current.getRovingProps(0);
    act(() => {
      props.onKeyDown({
        key: 'ArrowLeft',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.activeIndex).toBe(0);
  });

  it('Home jumps to first, End jumps to last', () => {
    const { result } = renderHook(() =>
      useRovingTabIndex({ itemCount: 5 }),
    );

    // Focus middle item first
    act(() => { result.current.getRovingProps(2).onFocus(); });
    expect(result.current.activeIndex).toBe(2);

    // End key
    act(() => {
      result.current.getRovingProps(2).onKeyDown({
        key: 'End',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.activeIndex).toBe(4);

    // Home key
    act(() => {
      result.current.getRovingProps(4).onKeyDown({
        key: 'Home',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.activeIndex).toBe(0);
  });

  it('supports grid navigation with columns', () => {
    const { result } = renderHook(() =>
      useRovingTabIndex({ itemCount: 9, columns: 3 }),
    );

    // ArrowDown from index 1 should go to index 4 (1 + 3)
    act(() => {
      result.current.getRovingProps(1).onFocus();
    });
    act(() => {
      result.current.getRovingProps(1).onKeyDown({
        key: 'ArrowDown',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent);
    });
    expect(result.current.activeIndex).toBe(4);
  });
});
