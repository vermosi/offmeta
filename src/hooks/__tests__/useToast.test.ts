import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useToast } from '../useToast';

describe('useToast', () => {
  it('returns toast and dismiss functions', () => {
    const { result } = renderHook(() => useToast());
    expect(typeof result.current.toast).toBe('function');
    expect(typeof result.current.dismiss).toBe('function');
    expect(Array.isArray(result.current.toasts)).toBe(true);
  });
});
