/**
 * Tests for useFocusTrap hook.
 * @module hooks/__tests__/useFocusTrap.test
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useFocusTrap } from '../useFocusTrap';

function createContainer(...elements: HTMLElement[]) {
  const container = document.createElement('div');
  elements.forEach((el) => container.appendChild(el));
  document.body.appendChild(container);
  return container;
}

function makeButton(label: string) {
  const btn = document.createElement('button');
  btn.textContent = label;
  return btn;
}

describe('useFocusTrap', () => {
  it('focuses the first focusable element on mount', () => {
    const btn1 = makeButton('First');
    const btn2 = makeButton('Second');
    const container = createContainer(btn1, btn2);

    renderHook(() => {
      const ref = useRef(container);
      useFocusTrap(ref, true);
    });

    expect(document.activeElement).toBe(btn1);
    document.body.removeChild(container);
  });

  it('does not trap when active is false', () => {
    const btn = makeButton('Only');
    const container = createContainer(btn);
    const previousActive = document.activeElement;

    renderHook(() => {
      const ref = useRef(container);
      useFocusTrap(ref, false);
    });

    // Focus should not have changed
    expect(document.activeElement).not.toBe(btn);
    document.body.removeChild(container);
  });

  it('sets tabindex on container when no focusable children', () => {
    const container = createContainer();

    renderHook(() => {
      const ref = useRef(container);
      useFocusTrap(ref, true);
    });

    expect(container.getAttribute('tabindex')).toBe('-1');
    document.body.removeChild(container);
  });

  it('wraps focus from last to first on Tab', () => {
    const btn1 = makeButton('First');
    const btn2 = makeButton('Last');
    const container = createContainer(btn1, btn2);
    btn2.focus();

    renderHook(() => {
      const ref = useRef(container);
      useFocusTrap(ref, true);
    });

    // Focus last element
    btn2.focus();
    expect(document.activeElement).toBe(btn2);

    // Simulate Tab on last element
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    const spy = vi.spyOn(event, 'preventDefault');
    document.dispatchEvent(event);

    expect(spy).toHaveBeenCalled();
    document.body.removeChild(container);
  });

  it('wraps focus from first to last on Shift+Tab', () => {
    const btn1 = makeButton('First');
    const btn2 = makeButton('Last');
    const container = createContainer(btn1, btn2);

    renderHook(() => {
      const ref = useRef(container);
      useFocusTrap(ref, true);
    });

    // First element is focused by default
    expect(document.activeElement).toBe(btn1);

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
    });
    const spy = vi.spyOn(event, 'preventDefault');
    document.dispatchEvent(event);

    expect(spy).toHaveBeenCalled();
    document.body.removeChild(container);
  });

  it('restores focus on unmount', () => {
    const outside = makeButton('Outside');
    document.body.appendChild(outside);
    outside.focus();
    expect(document.activeElement).toBe(outside);

    const btn = makeButton('Inside');
    const container = createContainer(btn);

    const { unmount } = renderHook(() => {
      const ref = useRef(container);
      useFocusTrap(ref, true);
    });

    expect(document.activeElement).toBe(btn);
    unmount();
    expect(document.activeElement).toBe(outside);

    document.body.removeChild(container);
    document.body.removeChild(outside);
  });
});
