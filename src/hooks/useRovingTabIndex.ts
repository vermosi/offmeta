/**
 * Roving tabindex hook for keyboard navigation across a list of items.
 * Only the active item has tabIndex=0; all others have tabIndex=-1.
 * Supports Arrow keys, Home, End. Works for grids (with column count) and linear lists.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseRovingTabIndexOptions {
  /** Total number of items */
  itemCount: number;
  /** Number of columns (for grid Arrow Up/Down navigation). Defaults to 1 (linear list). */
  columns?: number;
  /** Called when an item is activated via Enter/Space */
  onActivate?: (index: number) => void;
}

interface UseRovingTabIndexReturn {
  /** The currently focused index */
  activeIndex: number;
  /** Get the tabIndex for a given item */
  getTabIndex: (index: number) => 0 | -1;
  /** Get onKeyDown + onFocus props for each item container */
  getRovingProps: (index: number) => {
    tabIndex: 0 | -1;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onFocus: () => void;
    ref: (el: HTMLElement | null) => void;
    'data-roving-index': number;
  };
  /** Reset active index (e.g. when results change) */
  resetIndex: () => void;
}

export function useRovingTabIndex({
  itemCount,
  columns = 1,
  onActivate,
}: UseRovingTabIndexOptions): UseRovingTabIndexReturn {
  const [activeIndex, setActiveIndex] = useState(0);
  const [prevItemCount, setPrevItemCount] = useState(itemCount);
  if (prevItemCount !== itemCount) {
    setPrevItemCount(itemCount);
    setActiveIndex(0);
  }
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());

  const focusItem = useCallback((index: number) => {
    const el = itemRefs.current.get(index);
    el?.focus({ preventScroll: false });
  }, []);

  const moveTo = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= itemCount) return;
      setActiveIndex(nextIndex);
      // Focus needs a microtask so React can update tabIndex first
      requestAnimationFrame(() => focusItem(nextIndex));
    },
    [itemCount, focusItem],
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      let nextIndex: number | null = null;

      switch (e.key) {
        case 'ArrowRight':
          nextIndex = index + 1;
          break;
        case 'ArrowLeft':
          nextIndex = index - 1;
          break;
        case 'ArrowDown':
          nextIndex = index + columns;
          break;
        case 'ArrowUp':
          nextIndex = index - columns;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = itemCount - 1;
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onActivate?.(index);
          return;
        default:
          return;
      }

      if (nextIndex !== null && nextIndex >= 0 && nextIndex < itemCount) {
        e.preventDefault();
        moveTo(nextIndex);
      }
    },
    [columns, itemCount, moveTo, onActivate],
  );

  const getTabIndex = useCallback(
    (index: number): 0 | -1 => (index === activeIndex ? 0 : -1),
    [activeIndex],
  );

  const getRovingProps = useCallback(
    (index: number) => ({
      tabIndex: getTabIndex(index) as 0 | -1,
      onKeyDown: (e: React.KeyboardEvent) => handleKeyDown(index, e),
      onFocus: () => setActiveIndex(index),
      ref: (el: HTMLElement | null) => {
        if (el) {
          itemRefs.current.set(index, el);
        } else {
          itemRefs.current.delete(index);
        }
      },
      'data-roving-index': index,
    }),
    [getTabIndex, handleKeyDown],
  );

  const resetIndex = useCallback(() => setActiveIndex(0), []);

  return { activeIndex, getTabIndex, getRovingProps, resetIndex };
}
